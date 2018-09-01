import React, { Component, PropTypes } from 'react';
import ErrorStackParser from "error-stack-parser";

import {getStackFrames} from "./react-error-overlay/utils/getStackFrames";
import StackTrace from "./react-error-overlay/containers/StackTrace";


// Inlined function from https://github.com/shokai/deserialize-error
function deserializeError (obj) {
    if (!isSerializedError(obj)) return obj
    return Object.assign(new Error(), {stack: undefined}, obj)
}

export function isSerializedError (obj) {
    return obj &&
        typeof obj === 'object' &&
        typeof obj.name === 'string' &&
        (typeof obj.message === 'string' || typeof obj.stack === 'string')
}



export default class StackTraceTab extends Component {
    constructor(props) {
        super(props);

        this.state = {
            stackFrames : []
        };
    }
    componentDidMount() {
        //console.log("StackTraceTab mounted");
        this.checkForStackTrace();
    }

    componentDidUpdate(prevProps) {
        const {action, actions} = prevProps;

        if(action !== this.props.action || actions !== this.props.actions) {
            this.checkForStackTrace();
        }
    }

    checkForStackTrace() {
        const {action, actions : liftedActionsById} = this.props;

        if(!action) {
            return;
        }

        const liftedActions = Object.values(liftedActionsById);
        const liftedAction = liftedActions.find(liftedAction => liftedAction.action === action);


        if(liftedAction && liftedAction.stack) {
            const deserializedError = deserializeError(liftedAction.stack);

            getStackFrames(deserializedError)
                .then(stackFrames => {
                    console.log("Stack frames: ", stackFrames);
                    this.setState({stackFrames, currentError : deserializedError});
                })
        }
        else {
            this.setState({stackFrames : []})
        }
    }

    /*
    onStackFrameClicked = (i) => {
        const stackFrame = this.state.stackFrames[i];

        if(stackFrame) {
            const parsedFramesNoSourcemaps = ErrorStackParser.parse(this.state.currentError)
            console.log("Parsed stack frames: ", parsedFramesNoSourcemaps);

            if(chrome && chrome.devtools.panels.openResource) {
                const frameWithoutSourcemap = parsedFramesNoSourcemaps[i];
                const {fileName, lineNumber} = frameWithoutSourcemap;
                console.log("Parsed stack frame: ", stackFrame);
                console.log("Original stack frame: ", frameWithoutSourcemap);

                const adjustedLineNumber = Math.max(lineNumber - 1, 0);


                chrome.devtools.panels.openResource(fileName, adjustedLineNumber, (...callbackArgs) => {
                    console.log("openResource callback args: ", callbackArgs);
                    //console.log("Testing");
                });
            }
        }
    }
    */

    onStackLocationClicked = (fileLocation = {}) => {
        //console.log("Stack location args: ", ...args);

        const parsedFramesNoSourcemaps = ErrorStackParser.parse(this.state.currentError)
        //console.log("Parsed stack frames: ", parsedFramesNoSourcemaps);

        const {fileName, lineNumber} = fileLocation;

        if(fileName && lineNumber) {
            const matchingStackFrame = this.state.stackFrames.find(stackFrame => {
                const matches = (
                    (stackFrame._originalFileName === fileName && stackFrame._originalLineNumber === lineNumber) ||
                    (stackFrame.fileName === fileName && stackFrame.lineNumber === lineNumber)
                );
                return matches;
            })

            //console.log("Matching stack frame: ", matchingStackFrame);

            if(matchingStackFrame) {
                /*
                const frameIndex = this.state.stackFrames.indexOf(matchingStackFrame);
                const originalStackFrame = parsedFramesNoSourcemaps[frameIndex];
                console.log("Original stack frame: ", originalStackFrame);
                */
                const adjustedLineNumber = Math.max(lineNumber - 1, 0);


                chrome.devtools.panels.openResource(fileName, adjustedLineNumber, (result) => {
                    //console.log("openResource callback args: ", callbackArgs);
                    //console.log("Testing");
                    if(result.isError) {
                        const {fileName : finalFileName, lineNumber : finalLineNumber} = matchingStackFrame;
                        const adjustedLineNumber = Math.max(finalLineNumber - 1, 0);
                        chrome.devtools.panels.openResource(finalFileName, adjustedLineNumber, (result) => {
                            //console.log("openResource result: ", result);
                        });
                    }
                });
            }
        }

    }


    render() {
        const {stackFrames} = this.state;

        return (
            <div style={{backgroundColor : "white", color : "black"}}>
                <h2>Dispatched Action Stack Trace</h2>
                <div style={{display : "flex", flexDirection : "column"}}>
                    <StackTrace
                        stackFrames={stackFrames}
                        errorName={"N/A"}
                        contextSize={3}
                        editorHandler={this.onStackLocationClicked}
                    />
                </div>
            </div>
        )
    }
}