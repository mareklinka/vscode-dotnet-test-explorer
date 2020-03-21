export interface ITestResult {
  clearPreviousTestResults: boolean;
  testResults: Array<TestResult>;
}

export class TestResult {
  private className = '';
  private method = '';

  public constructor(
    private readonly _testId: string,
    private readonly _outcome: string,
    private readonly _message: string,
    private readonly _stackTrace: string,
    private readonly _duration?: string
  ) {}

  public get fullName(): string {
    return this.className + '.' + this.method;
  }

  public get id(): string {
    return this._testId;
  }

  public get outcome(): string {
    return this._outcome;
  }

  public get message(): string {
    return this._message;
  }

  public get stackTrace(): string {
    return this._stackTrace;
  }

  public get duration(): string {
    return this._duration ? this._duration : '';
  }

  public matches(className: string, method: string): boolean {
    return this.fullName.indexOf(className + '.' + method) > -1;
  }

  public matchesTheory(className: string, method: string): boolean {
    // Theory methodes include also the parameters,
    // so the "(" character identifies the method as a theory method.
    return this.method.indexOf(`${method}(`) > -1 && this.className.endsWith(className);
  }

  public updateName(className: string, method: string): void {
    this.className = className;

    // xUnit includes the class name in the name of the unit test
    // i.e. classname.method
    if (method.startsWith(className)) {
      this.method = method.substring(className.length + 1); // +1 to include the .
    } else {
      this.method = method;
    }
  }
}
