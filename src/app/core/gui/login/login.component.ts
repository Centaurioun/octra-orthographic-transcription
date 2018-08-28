import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {NgForm} from '@angular/forms';
import {LoginService} from './login.service';
import {APIService, AppStorageService, AudioService, OIDBLevel, OIDBLink, SettingsService} from '../../shared/service';
import {ComponentCanDeactivate} from './login.deactivateguard';
import {Observable} from 'rxjs/Observable';
import {FileSize, Functions, OCTRANIMATIONS, SubscriptionManager} from '../../shared';
import {SessionFile} from '../../obj/SessionFile';
import {TranslateService} from '@ngx-translate/core';
import {Converter} from '../../obj/Converters';
import {OctraDropzoneComponent} from '../octra-dropzone/octra-dropzone.component';
import 'rxjs/add/operator/catch';
import {ModalService} from '../../modals/modal.service';
import {ModalDeleteAnswer} from '../../modals/transcription-delete-modal/transcription-delete-modal.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers: [LoginService],
  animations: OCTRANIMATIONS
})
export class LoginComponent implements OnInit, OnDestroy, ComponentCanDeactivate, AfterViewInit {

  @ViewChild('f') loginform: NgForm;
  @ViewChild('dropzone') dropzone: OctraDropzoneComponent;
  @ViewChild('agreement') agreement: ElementRef;
  @ViewChild('localmode') localmode: ElementRef;
  @ViewChild('onlinemode') onlinemode: ElementRef;
  public valid_size = false;
  public agreement_checked = true;
  public projects: string[] = [];
  valid = false;
  member = {
    id: '',
    agreement: '',
    project: '',
    jobno: ''
  };
  err = '';
  onOfflineSubmit = (form: NgForm) => {
    if (!(this.appStorage.data_id === null || this.appStorage.data_id === undefined) && typeof this.appStorage.data_id === 'number') {
      // last was online mode
      this.setOnlineSessionToFree(() => {
        this.audioService.registerAudioManager(this.dropzone.audiomanager);
        this.appStorage.beginLocalSession(this.dropzone.files, false, () => {
          if (!(this.dropzone.oannotation === null || this.dropzone.oannotation === undefined)) {
            const new_levels: OIDBLevel[] = [];
            for (let i = 0; i < this.dropzone.oannotation.levels.length; i++) {
              new_levels.push(new OIDBLevel(i + 1, this.dropzone.oannotation.levels[i], i));
            }

            const new_links: OIDBLink[] = [];
            for (let i = 0; i < this.dropzone.oannotation.links.length; i++) {
              new_links.push(new OIDBLink(i + 1, this.dropzone.oannotation.links[i]));
            }

            this.appStorage.overwriteAnnotation(new_levels).then(
              () => {
                return this.appStorage.overwriteLinks(new_links);
              }
            ).then(() => {
              this.navigate();
            }).catch((err) => {
              console.error(err);
            });
          } else {
            this.navigate();
          }
        }, (error) => {
          alert(error);
        });
      });
    } else {
      this.audioService.registerAudioManager(this.dropzone.audiomanager);
      this.appStorage.beginLocalSession(this.dropzone.files, true, () => {
        if (!(this.dropzone.oannotation === null || this.dropzone.oannotation === undefined)) {
          const new_levels: OIDBLevel[] = [];
          for (let i = 0; i < this.dropzone.oannotation.levels.length; i++) {
            new_levels.push(new OIDBLevel(i + 1, this.dropzone.oannotation.levels[i], i));
          }

          const new_links: OIDBLink[] = [];
          for (let i = 0; i < this.dropzone.oannotation.links.length; i++) {
            new_links.push(new OIDBLink(i + 1, this.dropzone.oannotation.links[i]));
          }

          this.appStorage.overwriteAnnotation(new_levels).then(() => {
            return this.appStorage.overwriteLinks(new_links);
          }).then(() => {
            this.navigate();
          }).catch((err) => {
            console.error(err);
          });
        } else {
          this.navigate();
        }
      }, (error) => {
        alert(error);
      });
    }
  };
  newTranscription = () => {
    this.audioService.registerAudioManager(this.dropzone.audiomanager);

    this.appStorage.beginLocalSession(this.dropzone.files, false, () => {
        if (!(this.dropzone.oannotation === null || this.dropzone.oannotation === undefined)) {
          const new_levels: OIDBLevel[] = [];
          for (let i = 0; i < this.dropzone.oannotation.levels.length; i++) {
            new_levels.push(new OIDBLevel(i + 1, this.dropzone.oannotation.levels[i], i));
          }

          const new_links: OIDBLink[] = [];
          for (let i = 0; i < this.dropzone.oannotation.links.length; i++) {
            new_links.push(new OIDBLink(i + 1, this.dropzone.oannotation.links[i]));
          }

          this.appStorage.overwriteAnnotation(new_levels).then(
            () => {
              return this.appStorage.overwriteLinks(new_links);
            }
          ).then(() => {
            this.navigate();
          }).catch((err) => {
            console.error(err);
          });
        } else {
          this.navigate();
        }
      },
      (error) => {
        if (error === 'file not supported') {
          this.modService.show('error', {
            text: this.langService.instant('reload-file.file not supported', {type: ''})
          });
        }
      }
    );
  };
  private subscrmanager: SubscriptionManager;
  private navigate = (): void => {
    this.router.navigate(['user'], {
      queryParamsHandling: 'preserve'
    });
  };
  private setOnlineSessionToFree = (callback: () => void) => {
    // check if old annotation is already annotated
    this.subscrmanager.add(this.api.fetchAnnotation(this.appStorage.data_id).subscribe(
      (json) => {
        if (!(json.data === null || json.data === undefined) && json.data.hasOwnProperty('status') && json.data.status === 'BUSY') {
          this.subscrmanager.add(this.api.closeSession(this.appStorage.user.id, this.appStorage.data_id, '').subscribe(
            (result2) => {
              callback();
            }
          ));
        } else {
          callback();
        }
      },
      (err) => {
        // ignore error because this isn't important
        console.error(err);
        callback();
      }
    ));
  };

  get sessionfile(): SessionFile {
    return this.appStorage.sessionfile;
  }

  get apc(): any {
    return this.settingsService.app_settings;
  }

  public get Math(): Math {
    return Math;
  }

  constructor(private router: Router,
              public appStorage: AppStorageService,
              private api: APIService,
              private cd: ChangeDetectorRef,
              private settingsService: SettingsService,
              public modService: ModalService,
              private langService: TranslateService,
              private audioService: AudioService) {
    this.subscrmanager = new SubscriptionManager();
  }

  ngOnInit() {
    if (this.settingsService.responsive.enabled === false) {
      this.valid_size = window.innerWidth >= this.settingsService.responsive.fixedwidth;
    } else {
      this.valid_size = true;
    }

    const loaduser = () => {
      if (!(this.appStorage.user === null || this.appStorage.user === undefined) && this.appStorage.user.id !== '-1') {
        this.member.id = this.appStorage.user.id;
      }

      if (!(this.appStorage.user === null || this.appStorage.user === undefined) && this.appStorage.user.hasOwnProperty('project')) {
        this.member.project = this.appStorage.user.project;
      }

      if (!(this.appStorage.user === null || this.appStorage.user === undefined) && this.appStorage.user.hasOwnProperty('jobno')
        && this.appStorage.user.jobno !== null && this.appStorage.user.jobno > -1) {
        this.member.jobno = this.appStorage.user.jobno.toString();
      }
    };

    if (!this.appStorage.idbloaded) {
      this.subscrmanager.add(this.appStorage.loaded.subscribe(
        () => {
        },
        () => {
        },
        () => {
          loaduser();
        })
      );
    } else {
      loaduser();
    }

    new Promise<void>((resolve, reject) => {
      if (this.settingsService.isDBLoadded) {
        resolve();
      } else {
        this.subscrmanager.add(this.settingsService.dbloaded.subscribe(() => {
          resolve();
        }));
      }
    }).then(() => {
      this.loadPojectsList();
    });

  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.subscrmanager.destroy();
  }

  onSubmit(form: NgForm) {
    let new_session = false;
    let new_session_after_old = false;
    let continue_session = false;

    if ((this.member.jobno === null || this.member.jobno === undefined) || this.member.jobno === '') {
      this.member.jobno = '0';
    }

    if (this.appStorage.sessionfile !== null) {
      // last was offline mode, begin new Session
      new_session = true;

    } else {
      if (!(this.appStorage.data_id === null || this.appStorage.data_id === undefined) && typeof this.appStorage.data_id === 'number') {
        // last session was online session
        // check if credentials are available
        if (
          !(this.appStorage.user.project === null || this.appStorage.user.project === undefined) &&
          !(this.appStorage.user.jobno === null || this.appStorage.user.jobno === undefined) &&
          !(this.appStorage.user.id === null || this.appStorage.user.id === undefined)
        ) {
          // check if credentials are the same like before
          if (
            this.appStorage.user.id === this.member.id &&
            Number(this.appStorage.user.jobno) === Number(this.member.jobno) &&
            this.appStorage.user.project === this.member.project
          ) {
            continue_session = true;
          } else {
            new_session_after_old = true;
          }
        }
      } else {
        new_session = true;
      }
    }

    if (new_session_after_old) {
      this.setOnlineSessionToFree(
        () => {
          this.createNewSession(form);
        }
      );
    }

    if (new_session) {
      this.createNewSession(form);
    } else if (continue_session) {
      this.subscrmanager.add(this.api.fetchAnnotation(this.appStorage.data_id).subscribe(
        (json) => {
          if (json.hasOwnProperty('message')) {
            const counter = (json.message === '') ? '0' : json.message;
            this.appStorage.sessStr.store('jobs_left', Number(counter));
          }

          if (form.valid && this.agreement_checked
            && json.message !== '0'
          ) {
            if (this.appStorage.sessionfile !== null) {
              // last was offline mode
              this.appStorage.clearLocalStorage().catch((err) => {
                console.error(err);
              });
            }

            if (this.appStorage.usemode === 'online' && json.data.hasOwnProperty('prompt') || json.data.hasOwnProperty('prompttext')) {
              // get transcript data that already exists
              if (json.data.hasOwnProperty('prompt')) {
                const prompt = json.data.prompt;

                if (prompt) {
                  this.appStorage.prompttext = prompt;
                }
              } else if (json.data.hasOwnProperty('prompttext')) {
                const prompt = json.data.prompttext;

                if (prompt) {
                  this.appStorage.prompttext = prompt;
                }
              }
            } else {
              this.appStorage.prompttext = '';
            }

            const res = this.appStorage.setSessionData(this.member, json.data.id, json.data.url);
            if (res.error === '') {
              this.navigate();
            } else {
              alert(res.error);
            }
          } else {
            this.modService.show('login_invalid');
          }
        },
        (error) => {
          this.modService.show('error', {
            text: 'Server cannot be requested. Please check if you are online.'
          });
          console.error(error);
        }
      ));
    }
  }

  canDeactivate(): Observable<boolean> | boolean {
    return (this.valid);
  }

  @HostListener('window:resize', ['$event'])
  onResize($event) {
    if (this.settingsService.responsive.enabled === false) {
      this.valid_size = window.innerWidth >= this.settingsService.responsive.fixedwidth;
    } else {
      this.valid_size = true;
    }
  }

  getDropzoneFileString(file: File | SessionFile) {
    const fsize: FileSize = Functions.getFileSize(file.size);
    return Functions.buildStr('{0} ({1} {2})', [file.name, (Math.round(fsize.size * 100) / 100), fsize.label]);
  }

  getFileStatus(): string {
    if (!(this.dropzone.files === null || this.dropzone.files === undefined) && this.dropzone.files.length > 0 &&
      (!(this.dropzone.oaudiofile === null || this.dropzone.oaudiofile === undefined))) {
      // check conditions
      if ((this.appStorage.sessionfile === null || this.appStorage.sessionfile === undefined)
        || (this.dropzone.oaudiofile.name === this.appStorage.sessionfile.name)
        && (this.dropzone.oannotation === null || this.dropzone.oannotation === undefined)) {
        return 'start';
      } else {
        return 'new';
      }
    }

    return 'unknown';
  }

  getValidBrowsers(): string {
    let result = '';

    for (let i = 0; i < this.apc.octra.allowed_browsers.length; i++) {
      const browser = this.apc.octra.allowed_browsers[i];
      result += browser.name;
      if (i < this.apc.octra.allowed_browsers.length - 1) {
        result += ', ';
      }
    }

    return result;
  }

  loadPojectsList() {
    this.subscrmanager.add(this.api.getProjects().subscribe((json) => {
        if (Array.isArray(json.data)) {
          this.projects = json.data;

          if (!(this.settingsService.app_settings.octra.allowed_projects === null ||
            this.settingsService.app_settings.octra.allowed_projects === undefined)
            && this.settingsService.app_settings.octra.allowed_projects.length > 0) {
            // filter disabled projects
            this.projects = this.projects.filter((a) => {
              return (this.settingsService.app_settings.octra.allowed_projects.findIndex((b) => {
                return a === b.name;
              }) > -1);
            });
          }
          if (!(this.appStorage.user === null || this.appStorage.user === undefined) &&
            !(this.appStorage.user.project === null || this.appStorage.user.project === undefined) && this.appStorage.user.project !== '') {

            const found = this.projects.find(
              (x) => {
                return x === this.appStorage.user.project;
              });
            if ((found === null || found === undefined)) {
              // make sure that old project is in list
              this.projects.push(this.appStorage.user.project);
            }
          }
        }
      },
      (error) => {
        console.error(`ERROR: could not load list of projects:\n${error}`);
      }));
  }

  public selectProject(event: HTMLSelectElement) {
    this.member.project = event.value;
  }

  public testFile(converter: Converter, file: File) {
    const reader: FileReader = new FileReader();
    reader.onload = function (e) {
      // e.target.result should contain the text
    };
    reader.readAsText(file);
    reader.readAsText(file, 'utf-8');
  }

  onTranscriptionDelete() {
    this.modService.show('transcription_delete').then((answer: ModalDeleteAnswer) => {
      if (answer === ModalDeleteAnswer.DELETE) {
        this.newTranscription();
      }
    }).catch((error) => {
      console.error(error);
    });
  }

  private createNewSession(form: NgForm) {
    this.subscrmanager.add(this.api.beginSession(this.member.project, this.member.id, Number(this.member.jobno)).catch((error) => {
      alert('Server cannot be requested. Please check if you are online.');
      return Observable.throw(error);
    }).subscribe(
      (json) => {
        if (form.valid && this.agreement_checked
          && json.message !== '0'
        ) {

          // delete old data for fresh new session
          this.appStorage.clearSession();
          this.appStorage.clearLocalStorage().then(
            () => {
              const res = this.appStorage.setSessionData(this.member, json.data.id, json.data.url);

              // get transcript data that already exists
              if (json.data.hasOwnProperty('transcript')) {
                const transcript = JSON.parse(json.data.transcript);

                if (Array.isArray(transcript) && transcript.length > 0) {
                  this.appStorage.servertranscipt = transcript;
                }
              }

              if (this.appStorage.usemode === 'online' && json.data.hasOwnProperty('prompt') || json.data.hasOwnProperty('prompttext')) {
                // get transcript data that already exists
                if (json.data.hasOwnProperty('prompt')) {
                  const prompt = json.data.prompt;

                  if (prompt) {
                    this.appStorage.prompttext = prompt;
                  }
                } else if (json.data.hasOwnProperty('prompttext')) {
                  const prompt = json.data.prompttext;

                  if (prompt) {
                    this.appStorage.prompttext = prompt;
                  }
                }
              } else {
                this.appStorage.prompttext = '';
              }

              if (json.hasOwnProperty('message')) {
                const counter = (json.message === '') ? '0' : json.message;
                this.appStorage.sessStr.store('jobs_left', Number(counter));
              }

              if (res.error === '') {
                this.navigate();
              } else {
                this.modService.show('error', res.error);
              }
            }
          ).catch((err) => {
            console.error(err);
          });
        } else {
          this.modService.show('login_invalid');
        }
      }
    ));
  }
}
