import CodeMirror from "codemirror";
import {markdownRenderTasks} from "./render-tasks";
import {foldCodeHelper} from "./foldcode-helper";
import {markdownRenderTables} from "./render-tables";
import {CMBlockMarkerHelper} from "../../utils/CMBlockMarkerHelper";
import katex from 'katex'
import {debounce} from "ts-debounce";
import CMInlineMarkerHelper from "../../utils/CMInlineMarkerHelper";

module.exports = {
    default: function(_context) {
        return {
            plugin: function (CodeMirror) {
                CodeMirror.defineOption("zettlrPlugins", [], async function(cm, val, old) {
                    const debounceRender = debounce(() => {renderElements(cm)}, 400);

                    cm.on('cursorActivity', debounceRender)
                    cm.on('viewportChange', debounceRender)
                    cm.on('optionChange', debounceRender)
                });
            },
            codeMirrorOptions: {
                'zettlrPlugins': true,
            },
            codeMirrorResources: [
            ],
            assets: function() {
                return [
                    {
                        name: 'zettlr.css'
                    },
                    {
                        name: 'katex.min.css'
                    }
                ];
            }
        }
    },
}

function renderElements (cm: CodeMirror.Editor): void {
    markdownRenderTables(cm);
}
