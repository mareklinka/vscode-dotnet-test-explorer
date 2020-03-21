import { TestResult } from './testResult';
import { Utility } from './utility';

export class TestNode {
  private _isError = false;
  private _isLoading = false;
  private _icon = '';
  private _duration = '';

  constructor(
    private readonly _fqn: string,
    private _displayName: string,
    private readonly _parameters: string,
    testResults: Array<TestResult>,
    private readonly _children: Array<TestNode>,
    private readonly _isTheory: boolean = false
  ) {
    this.setIcon(testResults);
  }

  public get name(): string {
    return this._displayName + (this._duration ? ` [${this._duration}]` : '');
  }

  public get fqn(): string {
    // We need to translate from how the test is represented in the tree to what it's fully qualified name is
    return this._fqn;
  }

  public get isFolder(): boolean {
    return this._children && this._children.length > 0;
  }

  public get children(): Array<TestNode> {
    return this._children;
  }

  public get isError(): boolean {
    return !!this._isError;
  }

  public get icon(): string {
    return this._isLoading ? 'spinner.svg' : this._icon;
  }

  public get isTheory(): boolean {
    return this._isTheory;
  }

  public get parameters(): string {
    return this._parameters;
  }

  public setAsError(error: string) {
    this._isError = true;
    this._displayName = error;
  }

  public setAsLoading() {
    this._isLoading = true;
  }

  public setIcon(testResults: Array<TestResult>) {
    this._isLoading = false;

    if (!testResults) {
      this._icon = this.isFolder ? 'namespace.png' : 'run.png';
    } else {
      if (this.isFolder) {
        const testsForFolder = testResults.filter(tr => tr.fullName.startsWith(this.fqn));

        const nameBase = this.isTheory ? 'theory' : 'namespace';

        if (testsForFolder.some(tr => tr.outcome === 'Failed')) {
          this._icon = `${nameBase}Failed.png`;
        } else if (testsForFolder.some(tr => tr.outcome === 'NotExecuted')) {
          this._icon = `${nameBase}NotExecuted.png`;
        } else if (testsForFolder.some(tr => tr.outcome === 'Passed')) {
          this._icon = `${nameBase}Passed.png`;
        } else {
          this._icon = `${nameBase}.png`;
        }
      } else {
        const showDuration = Utility.getConfiguration().get<boolean>('showTestDuration');
        const resultForTest = testResults.find(
          tr => tr.fullName === this.fqn + (this._parameters ? this._parameters : '')
        );

        if (resultForTest) {
          this._icon = 'test'.concat(resultForTest.outcome, '.png');
          this._duration = showDuration ? resultForTest.duration : '';
        } else {
          this._icon = 'testNotRun.png';
          this._duration = '';
        }
      }
    }
  }
}
