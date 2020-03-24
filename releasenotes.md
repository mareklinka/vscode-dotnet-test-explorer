# 0.7.1 -> 0.8.1
This is the first version after forking the original repository. A ton of fixes and improvements have been implemented:

## New features
* Added support for .NET Core 3.1.100+
* Added support for collecting test coverage directly from the extension
* Drastically improved the test tree view
    * You can now run/debug/cover whole tree nodes (folders), not just individual tests
    * Theories are grouped properly into their own tree node
* Added support for showing test duration in the test pane and in code lens
* Added ability to debug/cover tests in context
    * Running tests in context has a new default keybinding
    * Debugging tests in context is also available as a new keybinding
* Removed Application Insights telemetry collection from the extension
* Automatic cleanup of working directories
    * When the extension exits, it's working folder is deleted

## Fixes
* Fixed nested class handling - the extension can now navigate correctly to tests within nested classes and display code lens on them
    * This also allows the run/debug tests in context to work for nested classes
* Fixed debugging tests on SDK 3.1+

## Engineering
* Added strict code style rules for the codebase
* Enabled strict null checking for increased robustness
* Bumped a lot of npm packages to newer versions
* Added CI and release builds (via Azure DevOps Pipelines)
* Improved the TRX (test results file) parsing engine to allow for better extensibility/versioning