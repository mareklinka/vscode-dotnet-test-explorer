"use strict";
import { ChildProcess, exec } from "child_process";
import * as fkill from "fkill";
import { platform } from "os";
import * as vscode from "vscode";
import { Event, EventEmitter } from "vscode";
import { Debug, IDebugRunnerInfo } from "./debug";
import { Logger } from "./logger";

export class Executor {
    public static runInTerminal(command: string, cwd?: string, addNewLine: boolean = true, terminal: string = "Test Explorer"): void {
        if (this.terminals[terminal] === undefined) {
            this.terminals[terminal] = vscode.window.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        if (cwd) {
            this.terminals[terminal].sendText(`cd "${cwd}"`);
        }
        this.terminals[terminal].sendText(command, addNewLine);
    }

    public static exec(command: string, callback, cwd?: string, addToProcessList?: boolean) {
        // DOTNET_CLI_UI_LANGUAGE does not seem to be respected when passing it as a parameter to the exec
        // function so we set the variable here instead
        process.env.DOTNET_CLI_UI_LANGUAGE = "en";
        process.env.VSTEST_HOST_DEBUG = "0";

        const childProcess = exec(this.handleWindowsEncoding(command), { encoding: "utf8", maxBuffer: 5120000, cwd }, callback);

        if (addToProcessList) {

            Logger.Log(`Process ${childProcess.pid} started`);

            this.processes.push(childProcess);

            childProcess.on("close", (code: number) => {

                const index = this.processes.map((p) => p.pid).indexOf(childProcess.pid);
                if (index > -1) {
                    this.processes.splice(index, 1);
                    Logger.Log(`Process ${childProcess.pid} finished`);
                    this.onTestProcessFinishedEmitter.fire();
                }
            });
        }

        return childProcess;
    }

    public static debug(command: string, callback, cwd?: string, addToProcessList?: boolean) {
        // DOTNET_CLI_UI_LANGUAGE does not seem to be respected when passing it as a parameter to the exec
        // function so we set the variable here instead
        process.env.DOTNET_CLI_UI_LANGUAGE = "en";
        process.env.VSTEST_HOST_DEBUG = "1";

        const childProcess = exec(this.handleWindowsEncoding(command), { encoding: "utf8", maxBuffer: 5120000, cwd }, callback);

        if (this.debugRunnerInfo && this.debugRunnerInfo.isSettingUp) {
            Logger.Log("Debugger already running");
            return;
        }

        const debug = new Debug();

        if (addToProcessList) {

            Logger.Log(`Process ${childProcess.pid} started`);

            this.processes.push(childProcess);

            childProcess.stdout.on("data", (buf) => {

                if (this.debugRunnerInfo && this.debugRunnerInfo.isRunning) {
                    return;
                }

                Logger.Log(`Waiting for debugger to attach`);

                const stdout = String(buf);

                this.debugRunnerInfo = debug.onData(stdout, this.debugRunnerInfo);

                if (this.debugRunnerInfo.config) {

                    Logger.Log(`Debugger process found (${this.debugRunnerInfo.processId}), attaching`);

                    this.debugRunnerInfo.isRunning = true;

                    vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], this.debugRunnerInfo.config).then( (c) => {
                        // When we attach to the debugger it seems to be stuck before loading the actual assembly that's running in code
                        // This is to try to continue past this invisible break point and into the actual code the user wants to debug
                        setTimeout(() => {
                            vscode.commands.executeCommand("workbench.action.debug.continue");
                        }, 1000);
                    });

                    vscode.debug.onDidTerminateDebugSession((_) => {
                        setTimeout(() => {
                            // sometimes the spawned process doesn't terminate properly
                            // wait for 5s for a graceful termination, then force-kill it
                            Logger.LogWarning(`The test process refused to terminate gracefully, force-stopping`);
                            fkill(childProcess.pid, { force: true });
                        }, 5000);
                    });
                }
            });

            childProcess.on("close", (code: number) => {
                Logger.Log(`Debugger finished`);

                this.debugRunnerInfo = null;

                vscode.commands.executeCommand("workbench.view.extension.test", "workbench.view.extension.test");

                const index = this.processes.map((p) => p.pid).indexOf(childProcess.pid);
                if (index > -1) {
                    this.processes.splice(index, 1);
                    Logger.Log(`Process ${childProcess.pid} finished`);
                    Executor.onTestProcessFinishedEmitter.fire();
                }
            });
        }

        return childProcess;
    }

    public static onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        delete this.terminals[closedTerminal.name];
    }

    public static stop() {
        this.processes.forEach((p) => {
            Logger.Log(`Stop processes requested - ${p.pid} stopped`);
            p.killed = true;
            fkill(p.pid, { force: true });
        });

        this.processes = [];
        this.debugRunnerInfo = null;
    }

    public static get onTestProcessFinished(): Event<void> {
        return Executor.onTestProcessFinishedEmitter.event;
    }

    private static debugRunnerInfo: IDebugRunnerInfo;

    private static terminals: { [id: string]: vscode.Terminal } = {};

    private static isWindows: boolean = platform() === "win32";

    private static processes: ChildProcess[] = [];

    private static onTestProcessFinishedEmitter = new EventEmitter<void>();

    private static handleWindowsEncoding(command: string): string {
        return this.isWindows ? `chcp 65001 | ${command}` : command;
    }
}
