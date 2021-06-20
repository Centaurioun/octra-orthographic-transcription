import {Component} from '@angular/core';
import {Subject, Subscription} from 'rxjs';
import {AppInfo} from '../../../app.info';
import {SubscriptionManager} from '@octra/utilities';
import {MdbModalConfig, MdbModalRef} from 'mdb-angular-ui-kit/modal';

export enum ModalDeleteAnswer {
  DELETE = 'DELETE',
  ABORT = 'ABORT'
}

@Component({
  selector: 'octra-transcription-delete-modal',
  templateUrl: './transcription-delete-modal.component.html',
  styleUrls: ['./transcription-delete-modal.component.scss']
})

export class TranscriptionDeleteModalComponent {
  public static config: MdbModalConfig = {
    keyboard: false,
    backdrop: false,
    ignoreBackdropClick: false
  };

  AppInfo = AppInfo;
  protected data = undefined;
  private actionperformed: Subject<ModalDeleteAnswer> = new Subject<ModalDeleteAnswer>();
  private subscrmanager = new SubscriptionManager<Subscription>();

  constructor(public modalRef: MdbModalRef<TranscriptionDeleteModalComponent>) {
  }

  public close(action: string) {
    this.modalRef.close();
    this.actionperformed.next(action as ModalDeleteAnswer);
  }
}
