### What?

A serverless project offering an API to perform CRUD operations on reviews in a DynamoDB.
In addition, if you add a csv file to the S3 bucket ty-mappings-bucket this will
trigger a lambda which currenly just logs the file contents.

### Prerequisites

- AWS CLI installed and configured
- [`serverless-framework`](https://github.com/serverless/serverless)
- [`node.js`](https://nodejs.org)


If you're using AWS SSO & the `~/.aws/config` file as opposed to the `credentials` file, install the [sso credential helper](https://www.npmjs.com/package/aws-sso-creds-helper) and run once to generate the relevant section in your `~/.aws/credentials` file (assumes use of default profile, change if not):

```bash
npm install -g aws-sso-creds-helper
ssocreds -p default
```