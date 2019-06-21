'use strict';
import { exec } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import * as path from 'path';
import { DocumentFormattingEditProvider, ExtensionContext, languages, Range, TextDocument, TextEdit, CompletionItemProvider, Position, CancellationToken, ProviderResult, CompletionItem, window, SnippetString, CompletionItemKind } from "vscode";

/**
 * format code
 */
class AsDocumentFormatter implements DocumentFormattingEditProvider {
    public provideDocumentFormattingEdits(document: TextDocument): ProviderResult<TextEdit[]> {
        let filesPath = path.join(__dirname, "../files/");
        let inputFile = filesPath + "a.as";
        let inputData = document.getText();
        writeFileSync(inputFile, inputData);

        let outFile = filesPath + "b.as";
        let jarFile = filesPath + "ASPrettyPrinter-1.1.jar";
        let javaPath = "java";
        let command = javaPath + " -jar " + jarFile + " -input " + inputFile + " -output " + outFile;
        return new Promise((resolve, reject) => {
            exec(command, (error: Error, stdout: string, stderr: string) => {
                if (!stderr) {
                    let firstLine = document.lineAt(0);
                    let endLine = document.lineAt(document.lineCount - 1);
                    let range = new Range(firstLine.range.start, endLine.range.end);
                    let outData = readFileSync(outFile).toString();
                    resolve([TextEdit.replace(range, outData)]);
                }
                else {
                    reject("error: " + stderr);
                }
            });
        })
    }
}

/**
 * comment completion
 */
class Completions implements CompletionItemProvider {
    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<CompletionItem[]> {
        let result = [];
        let lineStr = document.lineAt(position.line).text;
        let prevStr = lineStr.substring(0, position.character);
        let afterStr = lineStr.substring(position.character);
        // console.log(prevStr, afterStr);

        // /**
        let patt = /^\s*\/\*\*/;
        // *@
        let patt2 = /^\s*\*\s*\@/;
        // starts with /**
        if (patt.test(prevStr)) {
            // parse method/function entity
            if (document.lineCount > position.line + 1) {
                let nextLine = document.lineAt(position.line + 1).text;
                let funcArr = nextLine.match(/ function /g);
                let leftArr = nextLine.match(/\(/g);
                let rightArr = nextLine.match(/\)/g);
                if (funcArr && funcArr.length == 1 && leftArr && leftArr.length == 1 && rightArr && rightArr.length == 1) {
                    // let prevBlanks = prevStr.substr(0, prevStr.indexOf("/"));
                    // 参数列表
                    let left = nextLine.indexOf("(");
                    let right = nextLine.indexOf(")");
                    let paramsStr = nextLine.substring(left + 1, right);
                    paramsStr = paramsStr.replace(/\s+/g, "");
                    let params = [];
                    if (paramsStr != "") {
                        params = paramsStr.split(",");
                    }
                    // console.log(params.length);

                    // 返回值
                    let reValue = nextLine.substr(right + 1);
                    reValue = reValue.replace(/\W+/g, "");
                    // console.log(reValue + reValue.length);
                    if (reValue != "" && reValue != "void") {
                        reValue = " * @return $0\n";
                    }
                    else {
                        reValue = "";
                    }

                    // 生成的列表
                    let genStr = "\n";
                    if (reValue != "" || params.length > 0) {
                        genStr += " * $1\n";
                        let holderIndex = 2;
                        for (let i = 0; i < params.length; i++) {
                            const param = params[i].split(":")[0];
                            let index = holderIndex++;
                            if (reValue == "" && i == params.length - 1) {
                                index = 0;
                            }
                            genStr += " * @param " + param + " $" + index + "\n";
                        }
                    }
                    else {
                        genStr += " * $0\n";
                    }

                    genStr += reValue;

                    if (afterStr == "") {
                        genStr += " */";
                    }

                    // insert doc
                    let activeEditor = window.activeTextEditor;
                    let snippet = new SnippetString(genStr);
                    activeEditor.insertSnippet(snippet);
                }
            }
            // console.log("match /**",prevBlanks.length);
        }
        else if (patt2.test(prevStr)) {
            result.push(this.getCompletionItem("author"));
            result.push(this.getCompletionItem("copy"));
            result.push(this.getCompletionItem("default"));
            result.push(this.getCompletionItem("eventType"));
            result.push(this.getCompletionItem("example"));
            result.push(this.getCompletionItem("exampleText"));
            result.push(this.getCompletionItem("inheritDoc"));
            result.push(this.getCompletionItem("internal"));
            result.push(this.getCompletionItem("param"));
            result.push(this.getCompletionItem("private"));
            result.push(this.getCompletionItem("return"));
            result.push(this.getCompletionItem("see"));
            result.push(this.getCompletionItem("throws"));
        }

        return result;
    }

    private getCompletionItem(label: string): CompletionItem {
        let item = new CompletionItem(label, CompletionItemKind.Text);
        item.insertText = new SnippetString(label + " $0");
        return item;
    }
}

export function activate(context: ExtensionContext) {
    context.subscriptions.push(languages.registerDocumentFormattingEditProvider("actionscript", new AsDocumentFormatter()));
    context.subscriptions.push(languages.registerCompletionItemProvider("actionscript", new Completions(), "*", "@"));
}

export function deactivate(): Thenable<void> {
    let promises: Thenable<void>[] = [];
    return Promise.all(promises).then(() => undefined);
}