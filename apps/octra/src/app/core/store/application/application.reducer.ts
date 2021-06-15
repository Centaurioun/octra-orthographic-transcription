import {createReducer, on} from '@ngrx/store';
import {ApplicationState, LoadingStatus, LoginMode} from '../index';
import {isUnset} from '@octra/utilities';
import {ApplicationActions} from './application.actions';
import {ConfigurationActions} from '../configuration/configuration.actions';
import {IDBActions} from '../idb/idb.actions';
import {OnlineModeActions} from '../modes/online-mode/online-mode.actions';
import {AnnotationActions} from '../annotation/annotation.actions';

export const initialState: ApplicationState = {
  loading: {
    status: LoadingStatus.INITIALIZE,
    progress: 0,
    errors: []
  },
  reloaded: false,
  idb: {
    loaded: false,
    version: 1
  },
  language: 'en',
  appConfiguration: undefined,
  loggedIn: false,
  consoleEntries: [],
  options: {
    playOnHover: false,
    followPlayCursor: false,
    showLoupe: false,
    audioSettings: {
      volume: 1,
      speed: 1
    },
    easyMode: false,
    secondsPerLine: 10,
    highlightingEnabled: false
  }
};

export const reducer = createReducer(
  initialState,
  on(ApplicationActions.addError, (state: ApplicationState, {error}) => ({
    ...state,
    loading: {
      ...state.loading,
      status: LoadingStatus.FAILED,
      errors: [...state.loading.errors, error]
    }
  })),
  on(ApplicationActions.setReloaded, (state: ApplicationState, {reloaded}) => ({
    ...state,
    reloaded
  })),
  on(ApplicationActions.finishLoading, (state: ApplicationState) => ({
    ...state,
    loading: {
      ...state.loading,
      status: LoadingStatus.FINISHED
    }
  })),
  on(ApplicationActions.setAppLanguage, (state: ApplicationState, {language}) => ({
    ...state,
    language
  })),
  on(ApplicationActions.setDBVersion, (state: ApplicationState, {version}) => ({
    ...state,
    version
  })),
  on(ConfigurationActions.appConfigurationLoadSuccess, (state: ApplicationState) => ({
    ...state,
    appSettingsLoaded: true
  })),
  on(ApplicationActions.setConsoleEntries, (state: ApplicationState, {consoleEntries}) => ({
    ...state,
    consoleEntries
  })),
  on(IDBActions.loadOptionsSuccess, (state: ApplicationState, {variables}) => {
    let result = state;

    for (const variable of variables) {
      result = writeOptionToStore(result, variable.name, variable.value);
    }

    return result;
  }),
  on(ConfigurationActions.appConfigurationLoadSuccess, (state: ApplicationState, {appConfiguration}) => ({
    ...state,
    loading: {
      ...state.loading,
      status: (state.loading.progress === 75) ? LoadingStatus.FINISHED : LoadingStatus.LOADING,
      progress: state.loading.progress + 25
    },
    appConfiguration
  })),
  on(ConfigurationActions.loadGuidelinesSuccess, (state: ApplicationState) => ({
    ...state,
    loading: {
      ...state.loading,
      status: (state.loading.progress === 75) ? LoadingStatus.FINISHED : LoadingStatus.LOADING,
      progress: state.loading.progress + 25
    }
  })),
  on(ConfigurationActions.projectConfigurationLoaded, (state: ApplicationState) => ({
    ...state,
    loading: {
      ...state.loading,
      status: (state.loading.progress === 75) ? LoadingStatus.FINISHED : LoadingStatus.LOADING,
      progress: state.loading.progress + 25
    }
  })),
  on(ConfigurationActions.loadMethodsSuccess, (state: ApplicationState) => ({
    ...state,
    loading: {
      ...state.loading,
      status: (state.loading.progress === 75) ? LoadingStatus.FINISHED : LoadingStatus.LOADING,
      progress: state.loading.progress + 25
    }
  })),
  on(IDBActions.loadAnnotationLinksSuccess, (state: ApplicationState) => ({
    ...state,
    idb: {
      ...state.idb,
      loaded: true
    }
  })),
  on(OnlineModeActions.login, (state: ApplicationState) => ({
    ...state,
    mode: LoginMode.ONLINE,
    loggedIn: true
  })),
  on(OnlineModeActions.loginURLParameters, (state: ApplicationState, {urlParams}) => ({
    ...state,
    mode: LoginMode.URL,
    loggedIn: true,
    queryParams: urlParams
  })),
  on(ApplicationActions.setMode, (state: ApplicationState, {mode}) => ({
    ...state,
    mode
  })),
  on(AnnotationActions.logout, (state: ApplicationState) => {
    return {
      ...state,
      mode: null,
      queryParams: undefined,
      loggedIn: false
    };
  }),
);


function writeOptionToStore(state: ApplicationState, attribute: string, value: any): ApplicationState {
  switch (attribute) {
    case('version'):
      return {
        ...state,
        idb: {
          ...state.idb,
          version: value
        }
      };
    case('language'):
      return {
        ...state,
        language: (!isUnset(value)) ? value : 'en'
      };
    default:
      return state;
  }
}

