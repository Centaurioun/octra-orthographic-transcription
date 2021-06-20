import {Component, TemplateRef, ViewChild} from '@angular/core';
import {Subject} from 'rxjs';
import {MdbModalConfig, MdbModalRef, MdbModalService} from 'mdb-angular-ui-kit/modal';

@Component({
  selector: 'octra-yes-no-modal',
  templateUrl: './yes-no-modal.component.html',
  styleUrls: ['./yes-no-modal.component.css']
})
export class YesNoModalComponent {
  modalRef: MdbModalRef<YesNoModalComponent>;
  config: MdbModalConfig = {
    keyboard: false,
    backdrop: false,
    ignoreBackdropClick: false
  };
  @ViewChild('modal', {static: true}) modal: TemplateRef<any>;
  public data = {
    text: ''
  };
  private actionperformed: Subject<('yes' | 'no')> = new Subject<('yes' | 'no')>();

  constructor(private modalService: MdbModalService) {
  }

  public open(data: {
    text: string
  }): Promise<'yes' | 'no'> {
    return new Promise<'yes' | 'no'>((resolve, reject) => {
      this.data.text = data.text;
      this.modalRef = this.modalService.open(this.modal, this.config);
      const subscr = this.actionperformed.subscribe(
        (action) => {
          resolve(action);
          subscr.unsubscribe();
        },
        (err) => {
          reject(err);
        }
      );
    });
  }

  public close(action: 'yes' | 'no') {
    this.modalRef.close();
    this.actionperformed.next(action);
  }
}
