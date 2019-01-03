/*
 * Copyright (c) 2016 Charles University in Prague, Faculty of Arts,
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

import * as Immutable from 'immutable';
import RSVP from 'rsvp';
import {Kontext} from '../../types/common';
import {AjaxResponse} from '../../types/ajaxResponses';
import {PageModel} from '../../app/main';
import {ActionDispatcher, Action} from '../../app/dispatcher';
import {MultiDict} from '../../util';
import {TextTypesModel} from '../textTypes/main';
import {QueryContextModel} from './context';
import {validateNumber, setFormItemInvalid} from '../../models/base';
import {GeneralQueryFormProperties, QueryFormModel, appendQuery, WidgetsMap} from './common';


/**
 * This interface encodes values of multiple filter values. Array indices
 * should match query pipeline with non-filter ones represented by
 * 'undefined'.
 */
export interface FilterFormProperties extends GeneralQueryFormProperties {
    filters:Array<string>;
    maincorps:Array<[string, string]>;
    currQueryTypes:Array<[string, string]>;
    currQueries:Array<[string, string]>;  // current queries values (e.g. when restoring a form state)
    currDefaultAttrValues:Array<[string, string]>;
    tagBuilderSupport:Array<[string, boolean]>;
    currLposValues:Array<[string, string]>;
    currQmcaseValues:Array<[string, boolean]>;
    currInclkwicValues:Array<[string, boolean]>;
    inputLanguage:string;
    currPnFilterValues:Array<[string, string]>;
    currFilflVlaues:Array<[string, string]>;
    currFilfposValues:Array<[string, string]>;
    currFiltposValues:Array<[string, string]>;
    withinArgValues:Array<[string, number]>;
    opLocks:Array<[string, boolean]>;
    hasLemma:Array<[string, boolean]>;
    tagsetDoc:Array<[string, string]>;
}

/**
 *import {GeneralViewOptionsModel} from '../options/general';
 */
export function fetchFilterFormArgs<T>(args:{[ident:string]:AjaxResponse.ConcFormArgs},
        key:(item:AjaxResponse.FilterFormArgs)=>T):Array<[string, T]> {
    const ans = [];
    for (let formId in args) {
        if (args.hasOwnProperty(formId) && args[formId].form_type === 'filter') {
            ans.push([formId, key(<AjaxResponse.FilterFormArgs>args[formId])]);
        }
    }
    return ans;
}

/**
 * FilterFormModel handles all the filtsters applied within a query "pipeline".
 * Each filter is identified by its database ID (i.e. a key used by conc_persistence
 * plug-in to store it). Please note that it does not know the order of filters
 * in pipeline (it is up to QueryReplay store to handle this).
 */
export class FilterFormModel extends QueryFormModel {

    private maincorps:Immutable.Map<string, string>;

    private downArrowTriggersHistory:Immutable.Map<string, boolean>;

    private queryTypes:Immutable.Map<string, string>;

    private lposValues:Immutable.Map<string, string>;

    private matchCaseValues:Immutable.Map<string, boolean>;

    private defaultAttrValues:Immutable.Map<string, string>;

    private pnFilterValues:Immutable.Map<string, string>;

    /**
     * Highlighted token FIRST/LAST. Specifies which token is highlighted.
     * This applies in case multiple matching tokens are found.
     */
    private filflValues:Immutable.Map<string, string>;

    /**
     * Left range
     */
    private filfposValues:Immutable.Map<string, Kontext.FormValue<string>>;

    /**
     * Right range
     */
    private filtposValues:Immutable.Map<string, Kontext.FormValue<string>>;

    /**
     * Include kwic checkbox
     */
    private inclkwicValues:Immutable.Map<string, boolean>;

    private tagBuilderSupport:Immutable.Map<string, boolean>;

    private activeWidgets:Immutable.Map<string, string>;

    private withinArgs:Immutable.Map<string, number>;

    private hasLemma:Immutable.Map<string, boolean>;

    private tagsetDocs:Immutable.Map<string, string>;

    /**
     * If true for a certain key then the operation cannot be edited.
     * (this applies e.g. for filters generated by manual line
     * selection).
     */
    private opLocks:Immutable.Map<string, boolean>;

    private inputLanguage:string;


    constructor(
            dispatcher:ActionDispatcher,
            pageModel:PageModel,
            textTypesModel:TextTypesModel,
            queryContextModel:QueryContextModel,
            props:FilterFormProperties) {
        super(dispatcher, pageModel, textTypesModel, queryContextModel, props);

        this.maincorps = Immutable.Map<string, string>(props.maincorps);
        if (!this.queries.has('__new__')) {
            this.queries = this.queries.set('__new__', '');
        }
        this.downArrowTriggersHistory = Immutable.Map<string, boolean>(this.queries.map((_, sourceId) => [sourceId, false]));
        this.queryTypes = Immutable.Map<string, string>(props.currQueryTypes);
        if (!this.queryTypes.has('__new__')) {
            this.queryTypes = this.queries.set('__new__', 'iquery');
        }
        this.lposValues = Immutable.Map<string, string>(props.currLposValues);
        this.matchCaseValues = Immutable.Map<string, boolean>(props.currQmcaseValues);
        this.defaultAttrValues = Immutable.Map<string, string>(props.currDefaultAttrValues);
        this.pnFilterValues = Immutable.Map<string, string>(props.currPnFilterValues);
        this.filflValues = Immutable.Map<string, string>(props.currFilflVlaues);
        this.filfposValues = Immutable.Map<string, Kontext.FormValue<string>>(props.currFilfposValues);
        this.filtposValues = Immutable.Map<string, Kontext.FormValue<string>>(props.currFiltposValues);
        this.inclkwicValues = Immutable.Map<string, boolean>(props.currInclkwicValues);
        this.tagBuilderSupport = Immutable.Map<string, boolean>(props.tagBuilderSupport);
        this.opLocks = Immutable.Map<string, boolean>(props.opLocks);
        this.activeWidgets = Immutable.Map<string, string>(props.filters.map(item => null));
        this.withinArgs = Immutable.Map<string, number>(props.withinArgValues);
        this.hasLemma = Immutable.Map<string, boolean>(props.hasLemma);
        this.tagsetDocs = Immutable.Map<string, string>(props.tagsetDoc);
        this.inputLanguage = props.inputLanguage;
        this.currentAction = 'filter_form';
        this.supportedWidgets = this.determineSupportedWidgets();

        this.dispatcherRegister((action:Action) => {
            switch (action.actionType) {
                case 'CQL_EDITOR_DISABLE':
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_INPUT_SELECT_TYPE':
                    this.queryTypes = this.queryTypes.set(action.props['sourceId'], action.props['queryType']);
                    this.supportedWidgets = this.determineSupportedWidgets();
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_INPUT_SET_QUERY':
                    if (action.props['insertRange']) {
                        this.addQueryInfix(action.props['sourceId'], action.props['query'], action.props['insertRange']);

                    } else {
                        this.queries = this.queries.set(action.props['sourceId'], action.props['query']);
                    }
                    this.downArrowTriggersHistory = this.downArrowTriggersHistory.set(
                        action.props['sourceId'],
                        this.shouldDownArrowTriggerHistory(
                            action.props['query'],
                            action.props['rawAnchorIdx'],
                            action.props['rawFocusIdx']
                        )
                    );
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_INPUT_MOVE_CURSOR':
                    this.downArrowTriggersHistory = this.downArrowTriggersHistory.set(
                        action.props['sourceId'],
                        this.shouldDownArrowTriggerHistory(
                            this.queries.get(action.props['sourceId']),
                            action.props['anchorIdx'],
                            action.props['focusIdx']
                        )
                    );
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_INPUT_APPEND_QUERY':
                    this.queries = this.queries.set(
                        action.props['sourceId'],
                        appendQuery(
                            this.queries.get(action.props['sourceId']),
                            action.props['query'],
                            !!action.props['prependSpace']
                        )
                    );
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_INPUT_SET_LPOS':
                    this.lposValues = this.lposValues.set(action.props['sourceId'], action.props['lpos']);
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_INPUT_SET_MATCH_CASE':
                    this.matchCaseValues = this.matchCaseValues.set(action.props['sourceId'], action.props['value']);
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_INPUT_SET_DEFAULT_ATTR':
                    this.defaultAttrValues = this.defaultAttrValues.set(action.props['sourceId'], action.props['value']);
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_SET_POS_NEG':
                    this.pnFilterValues = this.pnFilterValues.set(action.props['filterId'], action.props['value']);
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_SET_FILFL':
                    this.filflValues = this.filflValues.set(action.props['filterId'], action.props['value']);
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_SET_RANGE':
                    this.setFilPosValue(
                        action.props['filterId'],
                        action.props['value'],
                        action.props['rangeId']
                    );
                    this.notifyChangeListeners();
                break;
                case'FILTER_QUERY_SET_INCL_KWIC':
                    this.inclkwicValues = this.inclkwicValues.set(action.props['filterId'], action.props['value']);
                    this.notifyChangeListeners();
                break;
                case 'FILTER_QUERY_APPLY_FILTER':
                    const err = this.validateForm(action.props['filterId']);
                    if (!err) {
                        this.submitQuery(action.props['filterId']);
                        this.notifyChangeListeners();

                    } else {
                        this.pageModel.showMessage('error', err);
                        this.notifyChangeListeners();
                    }
                break;
            }
        });
    }

    private validateForm(filterId:string):Error|null {
        if (validateNumber(this.filfposValues.get(filterId).value)) {
            this.filfposValues = this.filfposValues.set(filterId,
                        setFormItemInvalid(this.filfposValues.get(filterId), false));

        } else {
            this.filfposValues = this.filfposValues.set(filterId,
                setFormItemInvalid(this.filfposValues.get(filterId), true));
            return new Error(this.pageModel.translate('global__invalid_number_format'));
        }

        if (validateNumber(this.filtposValues.get(filterId).value)) {
            this.filtposValues = this.filtposValues.set(filterId,
                        setFormItemInvalid(this.filtposValues.get(filterId), false));

        } else {
            this.filtposValues = this.filtposValues.set(filterId,
                setFormItemInvalid(this.filtposValues.get(filterId), true));
            return new Error(this.pageModel.translate('global__invalid_number_format'));
        }
    }

    private setFilPosValue(filterId:string, value:string, rangeId:string):void {
        if (rangeId === 'filfpos') {
            this.filfposValues = this.filfposValues.set(filterId, {
                value: value,
                isInvalid: false,
                isRequired: true
            });

        } else if (rangeId === 'filtpos') {
            this.filtposValues = this.filtposValues.set(filterId, {
                value: value,
                isInvalid: false,
                isRequired: true
            });
        }
    }

    externalQueryChange(sourceId:string, query:string):void {
        this.queries = this.queries.set(sourceId, query);
        this.notifyChangeListeners();
    }

    getActiveWidget(sourceId:string):string {
        return this.activeWidgets.get(sourceId);
    }

    setActiveWidget(sourceId:string, ident:string):void {
        this.activeWidgets = this.activeWidgets.set(sourceId, ident);
    }

    getSubmitUrl(filterId:string):string {
        return this.pageModel.createActionUrl('filter', this.createSubmitArgs(filterId).items());
    }

    getCurrentSubcorpus():string {
        return undefined;
    }

    getAvailableSubcorpora():Immutable.List<{v:string; n:string}> {
        return Immutable.List<{v:string; n:string}>();
    }

    /**
     * Synchronize user input values from an external source
     * (typically a server response or a local cache).
     */
    syncFrom(fn:()=>RSVP.Promise<AjaxResponse.FilterFormArgs>):RSVP.Promise<AjaxResponse.FilterFormArgs> {
        return fn().then(
            (data) => {
                const filterId = data.op_key;
                if (data.form_type === 'filter') {
                    this.queries = this.queries.set(filterId, data.query);
                    this.queryTypes = this.queryTypes.set(filterId, data.query_type);
                    this.maincorps = this.queryTypes.set(filterId, data.maincorp);
                    this.pnFilterValues = this.pnFilterValues.set(filterId, data.pnfilter);
                    this.filflValues = this.filflValues.set(filterId, data.filfl);
                    this.filfposValues = this.filfposValues.set(filterId, {
                        value: data.filfpos, isInvalid: false, isRequired: true});
                    this.filtposValues = this.filtposValues.set(filterId, {
                        value: data.filtpos, isInvalid: false, isRequired: true});
                    this.inclkwicValues = this.inclkwicValues.set(filterId, data.inclkwic);
                    this.matchCaseValues = this.matchCaseValues.set(filterId, data.qmcase);
                    this.defaultAttrValues = this.defaultAttrValues.set(filterId, data.default_attr_value);
                    this.tagBuilderSupport = this.tagBuilderSupport.set(filterId, data.tag_builder_support);
                    this.withinArgs = this.withinArgs.set(filterId, data.within);
                    this.lposValues = this.lposValues.set(filterId, data.lpos);
                    this.hasLemma = this.hasLemma.set(filterId, data.has_lemma);
                    this.tagsetDocs = this.tagsetDocs.set(filterId, data.tagset_doc);
                    this.opLocks = this.opLocks.set(filterId, false);
                    return data;

                } else if (data.form_type === 'locked' || data.form_type == 'lgroup') {
                    this.opLocks = this.opLocks.set(filterId, true);
                    return data;

                } else {
                    throw new Error('Cannot sync filter model - invalid form data type: ' + data.form_type);
                }
            }
        );
    }

    private createSubmitArgs(filterId:string):MultiDict {
        const args = this.pageModel.getConcArgs();
        args.set('pnfilter', this.pnFilterValues.get(filterId));
        args.set('filfl', this.filflValues.get(filterId));
        args.set('filfpos', this.filfposValues.get(filterId).value);
        args.set('filtpos', this.filtposValues.get(filterId).value);
        args.set('inclkwic', this.inclkwicValues.get(filterId) ? '1' : '0');
        args.set('queryselector', `${this.queryTypes.get(filterId)}row`);
        if (this.withinArgs.get(filterId)) {
            args.set('within', '1');

        } else {
            args.remove('within');
        }
        args.set(this.queryTypes.get(filterId), this.getQueryUnicodeNFC(filterId));
        return args;
    }

    private testQueryNonEmpty(filterId:string):boolean {
        if (this.queries.get(filterId).length > 0) {
            return true;

        } else {
            this.pageModel.showMessage('error', this.pageModel.translate('query__query_must_be_entered'));
            return false;
        }
    }

    private testQueryTypeMismatch(filterId):boolean {
        const error = this.validateQuery(this.queries.get(filterId), this.queryTypes.get(filterId));
        return !error || window.confirm(this.pageModel.translate('global__query_type_mismatch'));
    }

    submitQuery(filterId:string):void {
        if (this.testQueryNonEmpty(filterId) && this.testQueryTypeMismatch(filterId)) {
            const args = this.createSubmitArgs(filterId);
            window.location.href = this.pageModel.createActionUrl('filter', args.items());
        }
    }

    getCorpora():Immutable.List<string> {
        return Immutable.List<string>([this.maincorps]);
    }

    getAvailableAlignedCorpora():Immutable.List<Kontext.AttrItem> {
        return Immutable.List<Kontext.AttrItem>();
    }

    getQueryTypes():Immutable.Map<string, string> {
        return this.queryTypes;
    }

    getLposValues():Immutable.Map<string, string> {
        return this.lposValues;
    }

    getMatchCaseValues():Immutable.Map<string, boolean> {
        return this.matchCaseValues;
    }

    getDefaultAttrValues():Immutable.Map<string, string> {
        return this.defaultAttrValues;
    }

    getInputLanguage():string {
        return this.inputLanguage;
    }

    getQuery(filterId:string):string {
        return this.queries.get(filterId);
    }

    getQueries():Immutable.Map<string, string> {
        return this.queries;
    }

    getPnFilterValues():Immutable.Map<string, string> {
        return this.pnFilterValues;
    }

    getFilfposValues():Immutable.Map<string, Kontext.FormValue<string>> {
        return this.filfposValues;
    }

    getFiltposValues():Immutable.Map<string, Kontext.FormValue<string>> {
        return this.filtposValues;
    }

    getFilflValues():Immutable.Map<string, string> {
        return this.filflValues;
    }

    getInclKwicValues():Immutable.Map<string, boolean> {
        return this.inclkwicValues;
    }

    getOpLocks():Immutable.Map<string, boolean> {
        return this.opLocks;
    }

    getWithinArgs():Immutable.Map<string, number> {
        return this.withinArgs;
    }

    private determineSupportedWidgets():WidgetsMap {
        const getWidgets = (filterId:string):Array<string> => {
            switch (this.queryTypes.get(filterId)) {
                case 'iquery':
                case 'lemma':
                case 'phrase':
                case 'word':
                case 'char':
                    return ['keyboard', 'history'];
                case 'cql':
                    const ans = ['keyboard', 'history'];
                    if (this.tagBuilderSupport.get(filterId)) {
                        ans.push('tag');
                    }
                    return ans;
            }
        }

        return new WidgetsMap(
            this.queries.keySeq()
            .map<[string, Immutable.List<string>]>(filterId =>
                [filterId, Immutable.List<string>(getWidgets(filterId))])
            .toList()
        );
    }

    getHasLemmaAttr():Immutable.Map<string, boolean> {
        return this.hasLemma;
    }

    getTagsetDocUrls():Immutable.Map<string, string> {
        return this.tagsetDocs;
    }

    getDownArrowTriggersHistory(sourceId:string):boolean {
        return this.downArrowTriggersHistory.get(sourceId);
    }
}
