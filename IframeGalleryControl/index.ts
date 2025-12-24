import type { IInputs, IOutputs } from "./generated/ManifestTypes";

export class IframeGalleryControl
  implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  private iframe!: HTMLIFrameElement;
  private context!: ComponentFramework.Context<IInputs>;
  private notifyOutputChanged!: () => void;

  private selectedRecordsJson = "";
  private actionType = "";
  private deleteReasons: unknown[] = [];

  init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ) {
    this.context = context;
    this.notifyOutputChanged = notifyOutputChanged;

    this.iframe = document.createElement("iframe");
    this.iframe.style.width = "100%";
    this.iframe.style.height = "600px";
    this.iframe.style.border = "none";

    this.iframe.src = context.parameters.webResourceUrl?.raw ?? "";
    container.appendChild(this.iframe);

    this.iframe.onload = () => this.sendDataToIframe();
    window.addEventListener("message", this.handleIframeEvents);
  }


private sendDataToIframe() {
  let columns: unknown[] = [], data: unknown[] = [], parsedDeleteReasons: unknown[] = [];

  try {
    columns = JSON.parse(this.context.parameters.columnsJson?.raw ?? "[]");
  } catch {
    // ignore
  }

  try {
    data = JSON.parse(this.context.parameters.dataJson?.raw ?? "[]");
  } catch {
    // ignore
  }

  try {
    parsedDeleteReasons = JSON.parse(this.context.parameters.deleteReasonJson?.raw ?? "[]");
  } catch {
    // ignore
  }

  this.deleteReasons = parsedDeleteReasons;

  this.iframe.contentWindow?.postMessage(
    {
      type: "INIT_GALLERY",
      columns,
      data,
      deleteReasons: this.deleteReasons
    },
    "*"
  );
}



private handleIframeEvents = (event: MessageEvent) => {
  if (!event.data?.type) return;

  const { type, payload } = event.data;

  switch (type) {
    case "SELECTION_CHANGE":
      this.actionType = "SELECTION_CHANGE";
      this.selectedRecordsJson = JSON.stringify(payload ?? []);
      break;

    case "EDIT":
      // still single record, no reason
      this.actionType = "EDIT";
      this.selectedRecordsJson = JSON.stringify(payload ? [payload] : []);
      break;

    case "DELETE":
    case "BULK_DELETE":
      
      this.actionType = type;
      this.selectedRecordsJson = JSON.stringify({
        records: payload?.records ?? [],
        reason: payload?.reason ?? ""
      });
      break;

    case "COPY":
      this.actionType = "COPY";
      this.selectedRecordsJson = JSON.stringify([{ requestId: payload }]);
      break;

    default:
      return;
  }

  this.notifyOutputChanged();
};

  updateView(context: ComponentFramework.Context<IInputs>) {
    this.context = context;
    this.sendDataToIframe();
  }

  getOutputs(): IOutputs {
    return {
      selectedRecordJson: this.selectedRecordsJson,
      actionType: this.actionType
    };
  }

  destroy() {
    window.removeEventListener("message", this.handleIframeEvents);
  }
}
 