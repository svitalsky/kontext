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

import * as React from 'react';
import { List } from 'cnc-tskit';
import { IActionDispatcher } from 'kombo';

import { Kontext } from '../../types/common';
import { InputModuleViews } from './input';
import { PluginInterfaces } from '../../types/plugins';
import { Actions, ActionName } from '../../models/query/actions';
import { AnyQuery, QueryType } from '../../models/query/query';


export interface AlignedModuleArgs {
    dispatcher:IActionDispatcher;
    he:Kontext.ComponentHelpers;
    inputViews:InputModuleViews;
}

export interface AlignedCorporaProps {
    availableCorpora:Array<{n:string; label:string}>;
    sectionVisible:boolean;
    alignedCorpora:Array<string>;
    queries:{[key:string]:AnyQuery};
    supportedWidgets:{[key:string]:Array<string>};
    wPoSList:Array<{n:string; v:string}>;
    lposValues:{[key:string]:string};
    forcedAttr:string;
    attrList:Array<Kontext.AttrItem>;
    inputLanguages:{[key:string]:string};
    queryStorageView:PluginInterfaces.QueryStorage.WidgetView;
    hasLemmaAttr:{[key:string]:boolean};
    useRichQueryEditor:boolean;
    tagHelperViews:{[key:string]:PluginInterfaces.TagHelper.View};
    onEnterKey:()=>void;
}

export interface AlignedViews {
    AlignedCorpora:React.FC<AlignedCorporaProps>;
}

export function init({dispatcher, he, inputViews}:AlignedModuleArgs):AlignedViews {

    const layoutViews = he.getLayoutViews();

    // ------------------ <AlignedCorpBlock /> -----------------------------
    /*
     TODO, important note: I had to define this component as stateful
     even if it has no state to prevent problems with React production
     build where React always re-render this component (even if props
     were the same, incl. object references). This has been causing
     loss of input/select/etc. focus when interacting with form elements
     inside this component. And this almost "formal" change helped.
     Maybe it's a React bug. It would be nice to isolate the error
     but the logic behind query form is already quite complicated so
     it would take same time.
     */
    class AlignedCorpBlock extends React.Component<{
        corpname:string;
        queries:{[corpus:string]:AnyQuery};
        label:string;
        widgets:Array<string>;
        hasLemmaAttr:boolean;
        wPoSList:Array<{n:string; v:string}>;
        lposValue:string;
        forcedAttr:string;
        attrList:Array<Kontext.AttrItem>;
        inputLanguage:string;
        queryStorageView:PluginInterfaces.QueryStorage.WidgetView;
        useRichQueryEditor:boolean;
        tagHelperView:PluginInterfaces.TagHelper.View;
        onEnterKey:()=>void;

    }, {}> {

        constructor(props) {
            super(props);
            this.handleCloseClick = this.handleCloseClick.bind(this);
            this.handleMakeMainClick = this.handleMakeMainClick.bind(this);
        }

        handleCloseClick() {
            dispatcher.dispatch<Actions.QueryInputRemoveAlignedCorpus>({
                name: ActionName.QueryInputRemoveAlignedCorpus,
                payload: {
                    corpname: this.props.corpname
                }
            });
        }

        handleMakeMainClick() {
            dispatcher.dispatch<Actions.QueryInputMakeCorpusPrimary>({
                name: ActionName.QueryInputMakeCorpusPrimary,
                 payload: {
                    corpname: this.props.corpname
                }
            });
        }
        render() {
            return (
                <div className="AlignedCorpBlock">
                    <div className="heading">
                        <h3>{this.props.label}</h3>
                        <span className="icons">
                            <a className="make-primary" title={he.translate('query__make_corpus_primary')}
                                    onClick={this.handleMakeMainClick}>
                                <img src={he.createStaticUrl('img/make-main.svg')}
                                    alt={he.translate('query__make_corpus_primary')} />
                            </a>
                            <a className="close-button" title={he.translate('query__remove_corpus')}
                                    onClick={this.handleCloseClick}>
                                <img src={he.createStaticUrl('img/close-icon.svg')}
                                        alt={he.translate('query__close_icon')} />
                            </a>
                        </span>
                    </div>
                    <div className="form">
                        <inputViews.TRQueryInputField
                            sourceId={this.props.corpname}
                            widgets={this.props.widgets}
                            wPoSList={this.props.wPoSList}
                            lposValue={this.props.lposValue}
                            forcedAttr={this.props.forcedAttr}
                            attrList={this.props.attrList}
                            inputLanguage={this.props.inputLanguage}
                            queryStorageView={this.props.queryStorageView}
                            useRichQueryEditor={this.props.useRichQueryEditor}
                            onEnterKey={this.props.onEnterKey}
                            tagHelperView={this.props.tagHelperView}
                            qsuggPlugin={null}
                            isNested={true}
                            customOptions={[
                                <inputViews.TRPcqPosNegField sourceId={this.props.corpname}
                                    span={2}
                                    value={this.props.queries[this.props.corpname].pcq_pos_neg}
                                    formType={Kontext.ConcFormTypes.QUERY} />,
                                <inputViews.TRIncludeEmptySelector
                                    value={this.props.queries[this.props.corpname].include_empty}
                                    corpname={this.props.corpname}
                                    span={1} />
                            ]} />
                    </div>
                </div>
            );
        }
    }

    // ------------------ <AlignedCorpora /> -----------------------------

    const AlignedCorpora:React.FC<AlignedCorporaProps> = (props) => {

        const handleAddAlignedCorpus = (evt) => {
            dispatcher.dispatch<Actions.QueryInputAddAlignedCorpus>({
                name: ActionName.QueryInputAddAlignedCorpus,
                payload: {
                    corpname: evt.target.value
                }
            });
        };

        const handleVisibilityChange = () => {
            dispatcher.dispatch<Actions.QueryToggleAlignedCorpora>({
                name: ActionName.QueryToggleAlignedCorpora
            });
        };

        const findCorpusLabel = (corpname) => {
            const ans = props.availableCorpora.find(x => x.n === corpname);
            return ans ? ans.label : corpname;
        };

        const corpIsUnused = (corpname:string) => {
            return !List.some(v => v === corpname, props.alignedCorpora);
        };

        return (
            <section className={`AlignedCorpora${props.sectionVisible ? '' : ' closed'}`} role="group" aria-labelledby="parallel-corpora-forms">
                <h2 id="parallel-corpora-forms">
                    <layoutViews.ExpandButton isExpanded={props.sectionVisible} onClick={handleVisibilityChange} />
                    <a onClick={handleVisibilityChange}>{he.translate('query__aligned_corpora_hd')}</a>
                </h2>
                {props.sectionVisible ?
                    <>
                        {List.map(
                            item => <AlignedCorpBlock
                                key={item}
                                label={findCorpusLabel(item)}
                                corpname={item}
                                queries={props.queries}
                                widgets={props.supportedWidgets[item]}
                                wPoSList={props.wPoSList}
                                lposValue={props.lposValues[item]}
                                forcedAttr={props.forcedAttr}
                                attrList={props.attrList}
                                tagHelperView={props.tagHelperViews[item]}
                                inputLanguage={props.inputLanguages[item]}
                                queryStorageView={props.queryStorageView}
                                hasLemmaAttr={props.hasLemmaAttr[item]}
                                useRichQueryEditor={props.useRichQueryEditor}
                                onEnterKey={props.onEnterKey} />,
                            props.alignedCorpora
                        )}
                        <div id="add-searched-lang-widget">
                            <select onChange={handleAddAlignedCorpus} value="">
                                <option value="" disabled={true}>
                                    {`-- ${he.translate('query__add_a_corpus')} --`}</option>
                                {props.availableCorpora
                                    .filter(item => corpIsUnused(item.n))
                                    .map(item => {
                                        return <option key={item.n} value={item.n}>{item.label}</option>;
                                    })}
                            </select>
                        </div>
                    </> :
                    null
                }
            </section>
        );
    };


    return {
        AlignedCorpora: AlignedCorpora
    };

}