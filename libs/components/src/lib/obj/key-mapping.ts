export class KeyMapping {
  /**
   * mapping for special keys
   */
  private static table: any = [
    {
      name: 'ALT',
      keyCode: 18
    },
    {
      name: 'CTRL',
      keyCode: 17
    }, {
      name: 'TAB',
      keyCode: 9
    },
    {
      name: 'BACKSPACE',
      keyCode: 8
    }, {
      name: 'ENTER',
      keyCode: 13
    }, {
      name: 'ESC',
      keyCode: 27
    }, {
      name: 'SPACE',
      keyCode: 32
    }, {
      name: 'SHIFT',
      keyCode: 16
    }, {
      name: 'ARROWLEFT',
      keyCode: 37
    }, {
      name: 'ARROWUP',
      keyCode: 38
    }, {
      name: 'ARROWRIGHT',
      keyCode: 39
    },
    {
      name: 'ARROWDOWN',
      keyCode: 40
    },
    {
      name: 'CMD',
      keyCode: 91
    },
    {
      name: 'CMD',
      keyCode: 93
    }
  ];

  /**
   *
   * gets the name of a special Key by number
   */
  public static getNameByCode(code: number): string {
    for (const tableElement of this.table) {
      if (tableElement.keyCode === code) {
        return tableElement.name;
      }
    }
    return '';
  }

  /**
   * returns combination of shurtcut as a string
   */
  public static getShortcutCombination($event): string {
    // TODO how to replace this line with non-deprecated methods?
    const keyCode = $event.keyCode || $event.which || $event.charCode;
    const alt = $event.altKey;
    const ctrl = $event.ctrlKey;
    const meta = $event.metaKey;
    const shift = $event.shiftKey;

    let name = this.getNameByCode(keyCode);
    if (name === '') {
      name = String.fromCharCode(keyCode).toUpperCase();
    }

    if (!name) {
      name = '';
    }

    if (name === 'CONTROL') {
      name = 'CTRL';
    }

    let comboKey = '';

    if (ctrl) {
      comboKey = 'CTRL';
    }

    if (meta) {
      comboKey = 'CMD';
    }

    if (alt) {
      comboKey += (comboKey !== '') ? ' + ' : '';
      comboKey += 'ALT';
    }

    if (shift) {
      comboKey += (comboKey !== '') ? ' + ' : '';
      comboKey += 'SHIFT';
    }

    // if name == comboKey, only one special Key pressed
    if (comboKey.indexOf(name) < 0) {
      if (comboKey !== '') {
        comboKey += ' + ';
      }

      if ($event.key !== '' && name !== '') {
        if (name.length === 1) {
          // keyName is normal char
          name = String.fromCharCode(keyCode);
        }
        comboKey += name;
      }
    }
    return comboKey;
  }
}
