import * as React from 'react';
import { IActionDispatcher } from 'kombo';
import { FilterRecord, FeatureSelectProps } from './models';
import * as Immutable from 'immutable';
import { Kontext } from '../../../types/common';

export function init(dispatcher:IActionDispatcher, ut:Kontext.ComponentHelpers):React.ComponentClass<FeatureSelectProps> {
  
    const CategoryDetail:React.FunctionComponent<{
        allValues:Immutable.List<string>;
        availableValues:Immutable.List<string>;
        onChangeHandler:(event) => void;
        categoryName:string;
        filterFeatures:Immutable.List<FilterRecord>;
    }> = (props) => {
        const categoryFilterRecord = new FilterRecord({'name': props.categoryName});
        const checkboxes = props.allValues.sort().map(value => {
            const filterRecord = categoryFilterRecord.set('value', value);
            return <li key={value}>
                <label style={props.availableValues.includes(value) ? {fontWeight: 'bold'} : {fontWeight: 'normal'}}>
                    <input
                        onChange={props.onChangeHandler}
                        type="checkbox"
                        name={props.categoryName}
                        value={value}
                        checked={props.filterFeatures.some(x => x.equals(filterRecord) ? true : false)} />
                    {value}
                </label>
            </li>
        });
        return <ul>{checkboxes}</ul>;
    }

    const CategorySelect:React.FunctionComponent<{
        selectedCategory:string;
        allFeatures:Immutable.Map<string, Immutable.List<string>>;
        availableFeatures:Immutable.Map<string, Immutable.List<string>>;
        onSelectCategoryHandler:(event) => void;
    }> = (props) => {
        const categories = props.allFeatures.keySeq().sort().map(category => {
            const availableValuesCount = (props.availableFeatures.has(category) ? props.availableFeatures.get(category).size : 0);
            return <option
                    key={category}
                    value={category}>
                {category + " (" + availableValuesCount + ")"}
                </option>
        })
        return <select onChange={props.onSelectCategoryHandler}>{categories}</select>;
    }

    const QueryLine:React.FunctionComponent<{
        filterFeatures:Immutable.List<FilterRecord>;
        handleRemoveFilter:(event) => void;
    }> = (props) => {
        const selected = props.filterFeatures.sort((a, b) => a.compare(b)).map(filter => {
            return <button
                type="button"
                key={filter.composeString()}
                name={filter.get('name')}
                value={filter.get('value')}
                className="util-button"
                onClick={props.handleRemoveFilter}>
            {filter.composeString()}
            </button>
        })
        return <div><p>Remove filter: {selected}</p></div>;
    }

    class FeatureSelect extends React.Component<FeatureSelectProps> {
        handleCheckboxChange(event) {
            if (event.target.checked) {
                dispatcher.dispatch({
                    name: 'TAGHELPER_ADD_FILTER',
                    payload: {name: event.target.name, value: event.target.value}
                });
            } else {
                this.handleRemoveFilter(event);
            }
        }

        handleRemoveFilter(event) {
            dispatcher.dispatch({
                name: 'TAGHELPER_REMOVE_FILTER',
                payload: {name: event.target.name, value: event.target.value}
            });
        };

        handleCategorySelect(event) {
            dispatcher.dispatch({
                name: 'TAGHELPER_SELECT_CATEGORY',
                payload: {value: event.target.value}
            });
        }

        componentDidMount() {
            dispatcher.dispatch({
                name: 'TAGHELPER_GET_INITIAL_FEATURES',
                payload: {}
            });
        }

        render() {
            if (this.props.error) {
                return <div>Error: {this.props.error.message}</div>;
            } else if (!this.props.isLoaded) {
                return <div>Loading...</div>;
            } else {
                return(
                    <div style={{position: "relative", width: "100%"}}>
                        <QueryLine
                            filterFeatures={this.props.filterFeaturesHistory.last()}
                            handleRemoveFilter={this.handleRemoveFilter} />
                        <CategorySelect
                            allFeatures={this.props.allFeatures}
                            availableFeatures={this.props.availableFeatures}
                            onSelectCategoryHandler={this.handleCategorySelect}
                            selectedCategory={this.props.showCategory} />
                        <CategoryDetail
                            onChangeHandler={(event) => this.handleCheckboxChange(event)}
                            filterFeatures={this.props.filterFeaturesHistory.last()}
                            categoryName={this.props.showCategory}
                            allValues={this.props.allFeatures.get(this.props.showCategory)}
                            availableValues={
                                this.props.availableFeatures.has(this.props.showCategory) ?
                                this.props.availableFeatures.get(this.props.showCategory) :
                                Immutable.List([])
                            } />
                    </div>
                );
            }
        }
    }

    return FeatureSelect;
}
