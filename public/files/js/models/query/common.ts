/*
 * Copyright (c) 2016 Charles University, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2016 Tomas Machalek <tomas.machalek@gmail.com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { Dict, List, tuple, pipe } from 'cnc-tskit';
import { IFullActionControl, StatefulModel } from 'kombo';

import { Kontext, TextTypes, ViewOptions } from '../../types/common';
import { PageModel } from '../../app/page';
import { TextTypesModel } from '../textTypes/main';
import { QueryContextModel } from './context';
import { parse as parseQuery, ITracer } from 'cqlParser/parser';
import { ConcServerArgs } from '../concordance/common';
import { QueryFormType, Actions, ActionName } from './actions';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PluginInterfaces } from '../../types/plugins';
import { Actions as CorpOptActions, ActionName as CorpOptActionName } from '../options/actions';


export type QueryType = 'simple'|'advanced';

export type CtxWindowType = 'left'|'both'|'right';

export type CtxLemwordType = 'any'|'all'|'none';

export interface QueryContextArgs {
    fc_lemword_window_type:CtxWindowType;
    fc_lemword_wsize:number;
    fc_lemword:string;
    fc_lemword_type:CtxLemwordType;
    fc_pos_window_type:CtxWindowType;
    fc_pos_wsize:number;
    fc_pos:string[];
    fc_pos_type:CtxLemwordType;
}

export interface ConcQueryArgs {
    queries:Array<{
        corpname:string;
        qtype:QueryType;
        query:string;
        qmcase:boolean;
        pcq_pos_neg:string;
        include_empty:boolean;
        default_attr:string;
        use_regexp:boolean;
    }>;
    maincorp:string|null;
    usesubcorp:string|null;
    viewmode:'kwic'|'sen'|'align';
    pagesize:number;
    shuffle:0|1;
    attrs:Array<string>;
    ctxattrs:Array<string>;
    attr_vmode:ViewOptions.AttrViewMode;
    base_viewattr:string;
    structs:Array<string>;
    refs:Array<string>;
    fromp:number;
    text_types:TextTypes.ExportedSelection;
    context:QueryContextArgs;
    type:'concQueryArgs';
}

export interface SampleServerArgs extends ConcServerArgs {
    rlines:number;
}

export interface SwitchMainCorpServerArgs extends ConcServerArgs {
    maincorp:string;
}

export interface FirstHitsServerArgs extends ConcServerArgs {
    fh_struct:string;
}

export interface FilterServerArgs extends ConcServerArgs {
    pnfilter:string;
    filfl:string;
    filfpos:string;
    filtpos:string;
    inclkwic:0|1;
    qtype:QueryType;
    query:string;
    qmcase:boolean;
    within:boolean;
    default_attr:string;
    use_regexp:boolean;
    type:'filterQueryArgs';
}

export interface SortServerArgs extends ConcServerArgs {
    sattr:string;
    skey:string;
    sbward:string;
    sicase:string;
    spos:string;
    type:'sortQueryArgs';
}

export interface MLSortServerArgs extends ConcServerArgs {
    levels:Array<{
        sattr:string;
        sbward:string;
        sicase:string;
        spos:string;
        ctx:string;
    }>;
    type:'mlSortQueryArgs';
}

export interface GeneralQueryFormProperties {
    forcedAttr:string;
    attrList:Array<Kontext.AttrItem>;
    structAttrList:Array<Kontext.AttrItem>;
    lemmaWindowSizes:Array<number>;
    posWindowSizes:Array<number>;
    wPoSList:Array<{v:string; n:string}>;
    useCQLEditor:boolean;
    tagAttr:string;
}

export const appendQuery = (origQuery:string, query:string, prependSpace:boolean):string => {
    return origQuery + (origQuery && prependSpace ? ' ' : '') + query;
};

export interface WithinBuilderData extends Kontext.AjaxResponse {
    structattrs:{[attr:string]:Array<string>};
}


export function shouldDownArrowTriggerHistory(query:string, anchorIdx:number,
            focusIdx:number):boolean {
    if (anchorIdx === focusIdx) {
        return (query || '').substr(anchorIdx+1).search(/[\n\r]/) === -1;

    } else {
        return false;
    }
}

export interface SuggestionsData {
    [sourceId:string]:{
        data:Array<PluginInterfaces.QuerySuggest.DataAndRenderer<unknown>>;
        isPartial:boolean;
        valuePosStart:number;
        valuePosEnd:number;
        attrPosStart?:number;
        attrPosEnd?:number;
    }
}


export interface QueryFormModelState {

    formType:QueryFormType;

    forcedAttr:string;

    attrList:Array<Kontext.AttrItem>;

    structAttrList:Array<Kontext.AttrItem>;

    lemmaWindowSizes:Array<number>;

    posWindowSizes:Array<number>;

    wPoSList:Array<{v:string; n:string}>;

    currentAction:string;

    currentSubcorp:string;

    queries:{[sourceId:string]:string}; // corpname|filter_id -> query

    queryTypes:{[sourceId:string]:QueryType};

    defaultAttrValues:{[key:string]:string};

    useRegexp:{[key:string]:boolean};

    matchCaseValues:{[key:string]:boolean};

    querySuggestions:SuggestionsData;

    tagBuilderSupport:{[sourceId:string]:boolean};

    useCQLEditor:boolean;

    tagAttr:string;

    widgetArgs:Kontext.GeneralProps;

    supportedWidgets:{[sourceId:string]:Array<string>};

    isAnonymousUser:boolean;

    activeWidgets:{[sourceId:string]:string|null};

    downArrowTriggersHistory:{[sourceId:string]:boolean};

    contextFormVisible:boolean;

    textTypesFormVisible:boolean;

    historyVisible:{[sourceId:string]:boolean};

    suggestionsVisible:{[sourceId:string]:boolean};

    suggestionsVisibility:PluginInterfaces.QuerySuggest.SuggestionVisibility;

    isBusy:boolean;

    cursorPos:number;

    /**
     * In case of a simple query, this sequence determines
     * which attribute is set in case nothing is specified by user.
     * The client starts with 0-th item and if nothing is found,
     * 1-th is used etc.
     */
    simpleQueryAttrSeq:Array<string>;

}

/**
 *
 */
export abstract class QueryFormModel<T extends QueryFormModelState> extends StatefulModel<T> {

    protected readonly pageModel:PageModel;

    protected readonly queryContextModel:QueryContextModel;

    protected readonly textTypesModel:TextTypesModel;

    protected readonly queryTracer:ITracer;

    protected readonly ident:string;

    protected readonly formType:QueryFormType;

    // stream of [source ID, rawAnchorIdx, rawFocusIdx]
    protected readonly autoSuggestTrigger:Subject<[string, number, number]>;

    // -------

    constructor(
            dispatcher:IFullActionControl,
            pageModel:PageModel,
            textTypesModel:TextTypesModel,
            queryContextModel:QueryContextModel,
            ident:string,
            initState:T) {
        super(
            dispatcher,
            initState
        );
        this.pageModel = pageModel;
        this.textTypesModel = textTypesModel;
        this.queryContextModel = queryContextModel;
        this.queryTracer = {trace:(_)=>undefined};
        this.ident = ident;
        this.formType = initState.formType;
        this.autoSuggestTrigger = new Subject<[string, number, number]>();
        this.autoSuggestTrigger.pipe(
            debounceTime(500)
        ).subscribe(
            ([sourceId,, rawFocusIdx]) => {
                const [srchWord, srchWordStart, srchWordEnd] = this.findCursorWord(
                    this.state.queries[sourceId],
                    rawFocusIdx
                );
                if (this.shouldAskForSuggestion(sourceId, srchWord)) {
                    dispatcher.dispatch<PluginInterfaces.QuerySuggest.Actions.AskSuggestions>({
                        name: PluginInterfaces.QuerySuggest.ActionName.AskSuggestions,
                        payload: {
                            corpora: List.concat(
                                this.pageModel.getConf<Array<string>>('alignedCorpora'),
                                [this.pageModel.getCorpusIdent().id]
                            ),
                            subcorpus: this.state.currentSubcorp,
                            value: srchWord,
                            valueStartIdx: srchWordStart,
                            valueEndIdx: srchWordEnd,
                            valueType: 'unspecified',
                            queryType: this.state.queryTypes[sourceId],
                            posAttr: this.state.defaultAttrValues[sourceId],
                            struct: undefined,
                            structAttr: undefined,
                            sourceId
                        }
                    });

                } else {
                    dispatcher.dispatch<PluginInterfaces.QuerySuggest.Actions.ClearSuggestions>({
                        name: PluginInterfaces.QuerySuggest.ActionName.ClearSuggestions
                    });
                }
            }
        );

        this.addActionSubtypeHandler<Actions.ToggleQueryHistoryWidget>(
            ActionName.ToggleQueryHistoryWidget,
            action => action.payload.formType === this.state.formType,
            action => {
                this.changeState(state => {
                    state.historyVisible[action.payload.sourceId] =
                        !state.historyVisible[action.payload.sourceId];
                    state.suggestionsVisible[action.payload.sourceId] = false;
                });
            }
        );

        this.addActionSubtypeHandler<Actions.ToggleQuerySuggestionWidget>(
            ActionName.ToggleQuerySuggestionWidget,
            action => action.payload.formType === this.state.formType,
            action => {
                this.changeState(state => {
                    state.suggestionsVisible[action.payload.sourceId] =
                        !state.suggestionsVisible[action.payload.sourceId];
                });
            }
        );

        this.addActionSubtypeHandler<Actions.QueryInputSetDefaultAttr>(
            ActionName.QueryInputSetDefaultAttr,
            action => action.payload.formType === this.state.formType,
            action => {
                this.changeState(state => {
                    state.defaultAttrValues[action.payload.sourceId] = action.payload.value;
                });
                this.autoSuggestTrigger.next(tuple(
                    action.payload.sourceId,
                    0,
                    0
                ));
            }
        );

        this.addActionSubtypeHandler<Actions.QueryInputSetMatchCase>(
            ActionName.QueryInputSetMatchCase,
            action => action.payload.formType === this.state.formType,
            action => {
                this.changeState(state => {
                    state.matchCaseValues[action.payload.sourceId] = action.payload.value;
                });
            }
        );

        this.addActionSubtypeHandler<Actions.QueryInputToggleAllowRegexp>(
            ActionName.QueryInputToggleAllowRegexp,
            action => action.payload.formType === this.state.formType,
            action => {
                this.changeState(state => {
                    state.useRegexp[action.payload.sourceId] = !state.useRegexp[action.payload.sourceId];
                    if (state.useRegexp[action.payload.sourceId]) {
                        state.matchCaseValues[action.payload.sourceId] = false;
                    }
                });
            }
        );

        this.addActionSubtypeHandler<Actions.SetActiveInputWidget>(
            ActionName.SetActiveInputWidget,
            action => action.payload.formType === this.state.formType,
            action => {
                this.changeState(state => {
                    state.activeWidgets[action.payload.sourceId] = action.payload.value;
                    state.widgetArgs = action.payload.widgetArgs || {};
                });
            }
        );

        this.addActionSubtypeHandler<Actions.QueryInputSetQuery>(
            ActionName.QueryInputSetQuery,
            action => action.payload.formType === this.formType,
            action => {
                this.changeState(state => {
                    if (action.payload.insertRange) {
                        this.addQueryInfix(
                            state,
                            action.payload.sourceId,
                            action.payload.query,
                            action.payload.insertRange
                        );

                    } else {
                        state.queries[action.payload.sourceId] = action.payload.query;
                    }
                    state.downArrowTriggersHistory[action.payload.sourceId] =
                        shouldDownArrowTriggerHistory(
                            action.payload.query,
                            action.payload.rawAnchorIdx,
                            action.payload.rawFocusIdx
                        );
                    state.cursorPos = action.payload.rawAnchorIdx;
                });
                this.autoSuggestTrigger.next(tuple(
                    action.payload.sourceId,
                    action.payload.rawAnchorIdx,
                    action.payload.rawFocusIdx
                ));
            }
        );

        this.addActionSubtypeHandler<Actions.QueryInputMoveCursor>(
            ActionName.QueryInputMoveCursor,
            action => action.payload.formType === this.formType,
            action => {
                this.changeState(state => {
                    state.downArrowTriggersHistory[action.payload.sourceId] =
                        shouldDownArrowTriggerHistory(
                            state.queries[action.payload.sourceId],
                            action.payload.rawAnchorIdx,
                            action.payload.rawFocusIdx
                        );
                        state.cursorPos = action.payload.rawAnchorIdx;
                });
                this.autoSuggestTrigger.next(tuple(
                    action.payload.sourceId,
                    action.payload.rawAnchorIdx,
                    action.payload.rawFocusIdx
                ));
            }
        );

        this.addActionSubtypeHandler<PluginInterfaces.QuerySuggest.Actions.ItemClicked>(
            PluginInterfaces.QuerySuggest.ActionName.ItemClicked,
            action => action.payload.formType === this.formType,
            action => {
                this.changeState(state => {
                    const wordPos =
                        action.payload.onItemClick === 'replace' ?
                            [action.payload.valueStartIdx, action.payload.valueEndIdx] :
                        action.payload.onItemClick === 'insert' ?
                            [state.cursorPos, state.cursorPos] :
                            undefined

                    if (wordPos === undefined) {
                        pageModel.showMessage(
                            'error',
                            `Unknown query suggestion click action: "${action.payload.onItemClick}"`
                        );

                    } else {
                        this.addQueryInfix(
                            state,
                            action.payload.sourceId,
                            action.payload.value,
                            [wordPos[0], wordPos[1]]
                        );

                        // TODO on refocus on the input cursor is on the end
                        // this is to prevent confusion
                        state.cursorPos = state.queries[action.payload.sourceId].length;

                        state.defaultAttrValues[action.payload.sourceId] = action.payload.attr;
                    }
                    state.suggestionsVisible[action.payload.sourceId] = false;
                });
            }
        );

        this.addActionHandler<PluginInterfaces.QuerySuggest.Actions.SuggestionsReceived>(
            PluginInterfaces.QuerySuggest.ActionName.SuggestionsReceived,
            action => {
                if (action.error) {
                    this.pageModel.showMessage('error', action.error);
                    this.changeState(state => {
                        state.querySuggestions = {};
                        state.suggestionsVisible[action.payload.sourceId] = false;
                    });

                } else {
                    this.changeState(state => {
                        state.querySuggestions[action.payload.sourceId] = {
                            data: action.payload.results,
                            isPartial: action.payload.isPartial,
                            valuePosStart: action.payload.valueStartIdx,
                            valuePosEnd: action.payload.valueEndIdx,
                            attrPosStart: action.payload.attrStartIdx,
                            attrPosEnd: action.payload.attrEndIdx
                        };
                        if (
                            state.suggestionsVisibility ===
                            PluginInterfaces.QuerySuggest.SuggestionVisibility.AUTO
                        ) {
                            state.suggestionsVisible[action.payload.sourceId] = true;
                            state.historyVisible[action.payload.sourceId] = false;
                        }
                    });
                }
            }
        );

        this.addActionHandler<PluginInterfaces.QuerySuggest.Actions.ClearSuggestions>(
            PluginInterfaces.QuerySuggest.ActionName.ClearSuggestions,
            action => {
                this.changeState(state => {
                    state.querySuggestions = {};
                });
            }
        );

        this.addActionHandler<CorpOptActions.SaveSettingsDone>(
            CorpOptActionName.SaveSettingsDone,
            action => {
                this.changeState(state => {
                    state.suggestionsVisibility = action.payload.qsVisibilityMode;
                    if (
                        state.suggestionsVisibility !==
                            PluginInterfaces.QuerySuggest.SuggestionVisibility.AUTO
                    ) {
                        state.suggestionsVisible = Dict.map(
                            v => false,
                            state.suggestionsVisible
                        );
                    }
                });
            }
        );
    }

    private findCursorWord(value:string, focusIdx:number):[string, number, number] {
        const ans:Array<[string, number, number]> = [];
        let curr:[string, number, number] = ['', 0, 0];
        for (let i = 0; i < value.length; i++) {
            if (value[i] === ' ') {
                if (curr) {
                    ans.push(curr);
                }
                curr = [value[i] === ' ' ? '' : value[i], i, i + 1];

            } else {
                curr[0] += value[i];
                curr[2] = i + 1;
            }
        }
        ans.push(curr);
        for (let i = 0; i < ans.length; i++) {
            const [, f, t] = ans[i];
            if (focusIdx >= f && focusIdx <= t) {
                return ans[i];
            }
        }
        return ['', 0, 0];
    }

    private shouldAskForSuggestion(sourceId:string, srchWord:string):boolean {
        return this.state.queryTypes[sourceId] !== 'advanced'
                        && this.state.suggestionsVisibility !==
                            PluginInterfaces.QuerySuggest.SuggestionVisibility.DISABLED
                        && !!srchWord.trim();
    }

    protected validateQuery(query:string, queryType:QueryType):boolean {
        const parseFn = ((query:string) => {
            switch (queryType) {
                case 'advanced':
                    return parseQuery.bind(
                        null, query + ';', {tracer: this.queryTracer});
                default:
                    return () => {};
            }
        })(query.trim());

        let mismatch;
        try {
            parseFn();
            mismatch = false;

        } catch (e) {
            mismatch = true;
            console.error(e);
        }
        return mismatch;
    }

    protected addQueryInfix(state:QueryFormModelState, sourceId:string, query:string,
            insertRange:[number, number]):void {
        state.queries[sourceId] = state.queries[sourceId].substring(0, insertRange[0]) + query +
                state.queries[sourceId].substr(insertRange[1]);
    }

    protected testQueryNonEmpty(sourceId:string):Error|null {
        if (this.state.queries[sourceId].length > 0) {
            return null;

        } else {
            return new Error(this.pageModel.translate('query__query_must_be_entered'));
        }
    }

    private isPossibleQueryTypeMismatch(sourceId:string):[boolean, QueryType] {
        const query = this.state.queries[sourceId];
        const queryType = this.state.queryTypes[sourceId];
        return tuple(this.validateQuery(query, queryType), queryType);
    }

    protected testQueryTypeMismatch():Error|null {
        const errors = pipe(
            this.state.queries,
            Dict.toEntries(),
            List.map(([corpname,]) => this.isPossibleQueryTypeMismatch(corpname)),
            List.filter(([err,]) => !!err)
        );
        if (List.empty(errors)) {
            return null;
        }
        const [err, type] = List.head(errors);
        if (window.confirm(this.pageModel.translate(
                'global__query_type_mismatch_confirm_{type}', {type:
                    type === 'advanced' ?
                            this.pageModel.translate('query__qt_advanced') :
                            this.pageModel.translate('query__qt_simple')}))) {
            return null;
        }
        return new Error(this.pageModel.translate('global__query_type_mismatch'));
    }

    getRegistrationId():string {
        return this.ident;
    }

    static hasSuggestionsFor(
        data:SuggestionsData,
        sourceId:string,
        plugin:PluginInterfaces.QuerySuggest.IPlugin
    ):boolean {

        return data[sourceId] &&
            List.some(s => !plugin.isEmptyResponse(s), data[sourceId].data);
    }
}