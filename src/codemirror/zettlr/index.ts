// import './render-math'
import CodeMirror from "codemirror";
import {markdownRenderTasks} from "./render-tasks";
import {foldCodeHelper} from "./foldcode-helper";
import {markdownRenderTables} from "./render-tables";
import {markdownRenderMath} from "./render-math";
import {CMBlockMarkerHelper} from "../../utils/CMBlockMarkerHelper";

module.exports = {
    default: function(_context) {
        return {
            plugin: function (CodeMirror) {
                CodeMirror.defineOption("zettlrPlugins", [], async function(cm, val, old) {
                    // While taskHandle is undefined, there's no task scheduled. Else, there is.
                    let taskHandle: number|undefined

                    const callback = function (cm: CodeMirror.Editor): void {
                        if (taskHandle !== undefined) {
                            return // Already a task registered
                        }

                        taskHandle = requestIdleCallback(function () {
                            renderElements(cm)
                            taskHandle = undefined // Next task can be scheduled now
                        }, { timeout: 1000 }) // Don't wait more than 1 sec before executing this
                    }

                    cm.on('cursorActivity', callback)
                    cm.on('viewportChange', callback) // renderElements)
                    cm.on('optionChange', callback)

                    new CMBlockMarkerHelper(cm, null, /:::test/, /:::/, (beginMatch, endMatch, content) => {
                        let testDiv = document.createElement('div');
                        testDiv.textContent = '=== Folded Test Code Block ===\n=== Folded Test Code Block ===';
                        return testDiv;
                    }, 'test-marker', false);
                });

                foldCodeHelper(CodeMirror);
            },
            codeMirrorOptions: {
                'zettlrPlugins': true,
                foldGutter: true,
                gutters: ["CodeMirror-foldgutter"],
                foldOptions: {
                    'widget': '\u00A0\u2026\u00A0', // nbsp ellipse nbsp
                    'scanUp': false // Do not search upwards if current line cannot be folded
                },
            },
            codeMirrorResources: [
                'addon/fold/foldcode',
                'addon/fold/foldgutter',
                'addon/fold/brace-fold',
                'addon/fold/indent-fold',
                'addon/fold/markdown-fold',
                'addon/fold/comment-fold'
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
    // const render = (cm as any).getOption('zettlr').render
    // cm.execCommand('markdownRenderMermaid')
    // cm.execCommand('clickableYAMLTags')
    // if (render.tables === true) cm.execCommand('markdownRenderTables')
    // if (render.iframes === true) cm.execCommand('markdownRenderIframes')
    // if (render.links === true) cm.execCommand('markdownRenderLinks')
    // if (render.images === true) cm.execCommand('markdownRenderImages')
    // if (render.math === true) cm.execCommand('markdownRenderMath')
    // if (render.citations === true) cm.execCommand('markdownRenderCitations')
    // if (render.tasks === true) cm.execCommand('markdownRenderTasks')
    // if (render.headingTags === true) cm.execCommand('markdownRenderHTags')
    // if (render.emphasis === true) cm.execCommand('markdownRenderEmphasis')
    markdownRenderMath(cm);
    markdownRenderTasks(cm);
    markdownRenderTables(cm);
}
