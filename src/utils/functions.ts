import postscribe from 'postscribe';
import { DataFrame } from '@grafana/data';
import { EditModeState } from 'utils/editmode';

interface ScriptArgs {
  data?: DataFrame[];
  command: string;
  editMode: boolean;
  editState: EditModeState;
  elem: HTMLCollection;
  editContent: string[];
  code: HTMLScriptElement;
}

let scriptsLoaded: Record<string, boolean> = {};
let linksLoaded: Record<string, boolean> = {};

export const init = (elem: HTMLCollection, code: HTMLScriptElement): any => {
  try {
    const f = new Function(
      'elem',
      `
      ${code.innerText}
      if (typeof onDivPanelInit === 'function') {
        onDivPanelInit(elem);
      }
    `
    );
    f(elem);
  } catch (ex) {
    throw ex;
  }
};

export const loadMeta = (elem: HTMLMetaElement) => {
  return new Promise(resolve => {
    elem.onload = () => {
      resolve(elem);
    };
    document.head.appendChild(elem);
  });
};

export const loadCSS = (elem: HTMLLinkElement) => {
  return new Promise(resolve => {
    const href = elem.getAttribute('href');
    if (href && !linksLoaded[href]) {
      elem.onload = () => {
        linksLoaded[href] = true;
        resolve(elem);
      };
      document.head.appendChild(elem);
    } else {
      resolve(elem);
    }
  });
};

export const load = async (elem: HTMLScriptElement, container: HTMLElement) => {
  try {
    return new Promise(resolve => {
      const url = elem.getAttribute('src');
      if (url && !scriptsLoaded[url]) {
        postscribe(container, elem.outerHTML, {
          done: () => {
            fetch(url, { mode: 'no-cors' })
              .then((response: Response) => response.text())
              .then(code => {
                new Function(code)();
                scriptsLoaded[url] = true;
                resolve(elem);
              });
          },
        });
      } else {
        resolve(elem);
      }
    });
  } catch (ex) {
    console.log('caught error', ex);
  }
};

export const run = (args: ScriptArgs): string => {
  try {
    const f = new Function(
      'data',
      'elem',
      'editMode',
      'editState',
      'editContent',
      'command',
      `
      if (typeof onDivPanelEnterEditMode === 'function' && editMode && !editState.prev && editState.curr ) {
        onDivPanelEnterEditMode(elem, editContent);
      }

      ${args.code.innerText}

      if (typeof onDivPanelExitEditMode === 'function' && !editMode && editState.prev && !editState.curr ) {
        return onDivPanelExitEditMode(elem);
      }

      if (data && typeof onDivPanelDataUpdate === 'function') {
        onDivPanelDataUpdate(data);
      }
    `
    );
    return f(args.data, args.elem, args.editMode, args.editState, args.editContent.join('\n'), args.command);
  } catch (ex) {
    throw ex;
  }
};

export const runEnterEditMode = (script: HTMLScriptElement, elem: HTMLCollection) => {
  try {
    const f = new Function(
      'elem',
      `
      if (typeof onDivPanelEnterEditMode === 'function') {
        onDivPanelEnterEditMode(elem);
      }

      ${script.innerText}
    `
    );
    return f(elem);
  } catch (ex) {
    throw ex;
  }
};

export const runExitEditMode = (script: HTMLScriptElement, elem: HTMLCollection): string => {
  try {
    const f = new Function(
      'elem',
      `
      ${script.innerText}

      if (typeof onDivPanelExitEditMode === 'function') {
        return onDivPanelExitEditMode(elem);
      }
    `
    );
    return f(elem);
  } catch (ex) {
    throw ex;
  }
};

export const parseHtml = (content: string) => {
  const scripts: HTMLScriptElement[] = [];
  const imports: HTMLScriptElement[] = [];
  const links: HTMLLinkElement[] = [];
  const meta: HTMLMetaElement[] = [];
  const divElement: HTMLDivElement = document.createElement('div');

  const parser = new DOMParser();
  const newDoc = parser.parseFromString(content, 'text/html');
  const head: HTMLHeadElement = newDoc.documentElement.children[0] as HTMLHeadElement;
  const body: HTMLBodyElement = newDoc.documentElement.children[1] as HTMLBodyElement;

  for (let i = 0; i < head.children.length; i++) {
    switch (head.children[i].nodeName) {
      case 'META':
        meta.push(head.children[i].cloneNode(true) as HTMLMetaElement);
        break;
      case 'LINK':
        links.push(head.children[i].cloneNode(true) as HTMLLinkElement);
        break;
      case 'STYLE':
        divElement.appendChild(head.children[i].cloneNode(true));
        break;
      case 'SCRIPT':
        imports.push(head.children[i].cloneNode(true) as HTMLScriptElement);
        break;
      default:
        break;
    }
  }

  for (let i = 0; i < body.children.length; i++) {
    switch (body.children[i].nodeName) {
      case 'SCRIPT':
        scripts.push(body.children[i].cloneNode(true) as HTMLScriptElement);
        body.children[i].remove();
        break;
      case 'STYLE':
        divElement.appendChild(body.children[i].cloneNode(true));
        break;
      default:
        divElement.appendChild(body.children[i].cloneNode(true));
        break;
    }
  }

  return {
    html: divElement.innerHTML,
    meta,
    scripts,
    imports,
    links,
  };
};

export const parseScripts = (content: string) => {
  const scripts: HTMLScriptElement[] = [];
  const parser = new DOMParser();
  const newDoc = parser.parseFromString(content, 'text/html');
  const body: HTMLBodyElement = newDoc.documentElement.children[1] as HTMLBodyElement;

  for (let i = 0; i < body.children.length; i++) {
    switch (body.children[i].nodeName) {
      case 'SCRIPT':
        scripts.push(body.children[i].cloneNode(true) as HTMLScriptElement);
        break;
    }
  }

  return scripts;
};
