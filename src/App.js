import React, { PureComponent } from 'react';
import { Provider } from 'react-redux';
import Store from './store';
import {
  readInitialState,
  loadSettingsFromConfigFile,
  subscribeToChanges,
  persistField,
  getPersistedField,
} from './util/settings_persister';
import runAllMigrations from './migrations';
import parseQueryString from './util/parse_query_string';
import { BrowserRouter as Router } from 'react-router-dom';

import { DragDropContext } from 'react-beautiful-dnd';

import { reorderCaptureTemplate } from './actions/capture';
import { reorderTags } from './actions/org';
import { authenticate } from './actions/sync_backend';

import './App.css';
import './base.css';

import Entry from './components/Entry';

import _ from 'lodash';

export default class App extends PureComponent {
  constructor(props) {
    super(props);

    runAllMigrations();

    this.store = Store(readInitialState());
    this.store.subscribe(subscribeToChanges(this.store));

    _.bindAll(this, ['handleDragEnd']);
  }

  componentDidMount() {
    const queryStringContents = parseQueryString(window.location.hash);
    const authenticatedSyncService = getPersistedField('authenticatedSyncService', true);
    console.log("authenticatedSyncService = ", authenticatedSyncService);

    if (!!authenticatedSyncService) {
      switch (authenticatedSyncService) {
      case 'Dropbox':
        const dropboxAccessToken = queryStringContents.access_token;
        if (dropboxAccessToken) {
          this.store.dispatch(authenticate('Dropbox', dropboxAccessToken));
          persistField('dropboxAccessToken', dropboxAccessToken);
          window.location.hash = '';
        } else {
          const persistedDropboxAccessToken = getPersistedField('dropboxAccessToken', true);
          if (!!persistedDropboxAccessToken) {
            this.store.dispatch(authenticate('Dropbox', persistedDropboxAccessToken));
            loadSettingsFromConfigFile(this.store.dispatch, this.store.getState);
          }
        }
        break;
      case 'Google Drive':
        this.store.dispatch(authenticate('Google Drive'));
        break;
      default:
      }
    } else {

    }
  }

  handleDragEnd(result) {
    if (!result.destination) {
      return;
    }

    if (result.type === 'CAPTURE-TEMPLATE') {
      this.store.dispatch(reorderCaptureTemplate(result.source.index, result.destination.index));
    } else if (result.type === 'TAG') {
      this.store.dispatch(reorderTags(result.source.index, result.destination.index));
    }
  }

  render() {
    return (
      <DragDropContext onDragEnd={this.handleDragEnd}>
        <Router>
          <Provider store={this.store}>
            <div className="App">
              <Entry />
            </div>
          </Provider>
        </Router>
      </DragDropContext>
    );
  }
}
