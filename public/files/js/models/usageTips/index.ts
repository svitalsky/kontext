/*
 * Copyright (c) 2018 Charles University, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2018 Tomas Machalek <tomas.machalek@gmail.com>
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

import { StatelessModel, IActionDispatcher } from 'kombo';
import { tuple, List, pipe, Dict } from 'cnc-tskit';

import { Actions, ActionName } from './actions';
import { Actions as QueryActions, ActionName as QueryActionName } from '../query/actions';
import { IUnregistrable } from '../common/common';
import { Actions as GlobalActions, ActionName as GlobalActionName } from '../common/actions';
import { PluginInterfaces } from '../../types/plugins';



export enum UsageTipCategory {
    QUERY = 'query',
    CQL_QUERY = 'cql-query',
    CONCORDANCE = 'conc'
}


const availableTips = [
    {messageId: 'query__tip_01', category: [UsageTipCategory.QUERY, UsageTipCategory.CQL_QUERY]},
    {messageId: 'query__tip_02', category: [UsageTipCategory.CQL_QUERY]},
    {messageId: 'query__tip_03', category: [UsageTipCategory.CQL_QUERY]},
    {messageId: 'query__tip_04', category: [UsageTipCategory.QUERY, UsageTipCategory.CQL_QUERY]},
    {messageId: 'query__tip_05', category: [UsageTipCategory.QUERY, UsageTipCategory.CQL_QUERY]},
    {messageId: 'query__tip_06', category: [UsageTipCategory.QUERY, UsageTipCategory.CQL_QUERY]},
    {messageId: 'concview__tip_01', category: [UsageTipCategory.CONCORDANCE]},
    {messageId: 'concview__tip_02', category: [UsageTipCategory.CONCORDANCE]},
    {messageId: 'concview__tip_03', category: [UsageTipCategory.CONCORDANCE]},
    {messageId: 'concview__tip_04', category: [UsageTipCategory.CONCORDANCE]}
];

export interface UsageTipsState {
    availableTips:Array<{messageId:string; category:UsageTipCategory[]}>;
    currentHints:{[key in UsageTipCategory]:string};
    hintsPointers:{[key in UsageTipCategory]:number};
    forcedTip:string;
}


/**
 *
 */
export class UsageTipsModel extends StatelessModel<UsageTipsState> implements IUnregistrable {

    private translatorFn:(s:string)=>string;

    constructor(dispatcher:IActionDispatcher, translatorFn:(s:string)=>string) {
        const pointers = pipe(
            [UsageTipCategory.CONCORDANCE, UsageTipCategory.QUERY, UsageTipCategory.CQL_QUERY],
            List.map(cat => {
                const avail = availableTips.filter(v => v.category.includes(cat));
                return tuple(cat, Math.round(Math.random() * (avail.length - 1)));
            }),
            Dict.fromEntries()
        );
        super(
            dispatcher,
            {
                hintsPointers: pointers,
                currentHints: pipe(
                    [UsageTipCategory.CONCORDANCE, UsageTipCategory.QUERY, UsageTipCategory.CQL_QUERY],
                    List.map(cat => {
                        const avail = availableTips.filter(v => v.category.includes(cat));
                        return tuple(
                            cat,
                            avail.length > 0 ? translatorFn(avail[pointers[cat]].messageId) : null
                        );
                    }),
                    Dict.fromEntries()
                ),
                availableTips,
                forcedTip: null
            }
        );
        this.translatorFn = translatorFn;

        this.addActionHandler<Actions.NextQueryHint>(
            ActionName.NextQueryHint,
            (state, action) => {
                this.setNextHint(state, UsageTipCategory.QUERY);
            }
        );

        this.addActionHandler<Actions.NextCqlQueryHint>(
            ActionName.NextCqlQueryHint,
            (state, action) => {
                this.setNextHint(state, UsageTipCategory.CQL_QUERY);
            }
        );

        this.addActionHandler<Actions.NextConcHint>(
            ActionName.NextConcHint,
            (state, action) => {
                this.setNextHint(state, UsageTipCategory.CONCORDANCE);
            }
        );

        this.addActionHandler<GlobalActions.SwitchCorpus>(
            GlobalActionName.SwitchCorpus,
            (state, action) => {
                state.forcedTip = null;
            },
            (state, action, dispatch) => {
                dispatch<GlobalActions.SwitchCorpusReady<{}>>({
                    name: GlobalActionName.SwitchCorpusReady,
                    payload: {
                        modelId: this.getRegistrationId(),
                        data: {}
                    }
                });
            }
        );

        this.addActionHandler<PluginInterfaces.QuerySuggest.Actions.SuggestionsReceived>(
            PluginInterfaces.QuerySuggest.ActionName.SuggestionsReceived,
            (state, action) => {
                state.forcedTip = List.some(v => !Dict.empty(v.contents['data']), action.payload.results) ? this.translatorFn('query__tip_06') : state.forcedTip
            }
        );

        this.addActionHandler<QueryActions.QueryInputSetQType>(
            QueryActionName.QueryInputSetQType,
            (state, action) => {
                state.forcedTip = null;
            }
        );
    }

    getRegistrationId():string {
        return 'usage-tips-model';
    }

    private setNextHint(state:UsageTipsState, category:UsageTipCategory):void {
        const curr = state.hintsPointers[category];
        const avail = state.availableTips.filter(v => v.category.includes(category));
        state.forcedTip = null;
        state.hintsPointers[category] = (curr + 1) % avail.length;
        state.currentHints[category] = this.translatorFn(
            avail[state.hintsPointers[category]].messageId);
    }

}