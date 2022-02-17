import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getBarcodeScanner } from 'lightning/mobileCapabilities';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord } from 'lightning/uiRecordApi';
import SCANED_RESLT from '@salesforce/schema/ScanedResult__c';
import SCANED_RESULT_JAN from '@salesforce/schema/ScanedResult__c.JAN_Code__c';

export default class YBarcodeScanner extends NavigationMixin(LightningElement) {

    scannedBarcode = '';

    scanedResultId = '';

    scanedResultName = '';

    debug = '';

    @api
    get hasResult() {
        if (this.scanedResultName) {
            return true;
        }
        return false;
    }

    @api
    get scannedBarcodeMessage() {
        if (this.scannedBarcode) {
            return 'バーコード: ' + this.scannedBarcode;
        } else {
            return '';
        }
    }

    handleBeginScanClick(event) {
        this.scannedBarcode = '';
        const myScanner = getBarcodeScanner();
        const scanningOptions = {
            barcodeTypes: [myScanner.barcodeTypes.EAN_13, myScanner.barcodeTypes.EAN_8],
            instructionText: "バーコードにかざしてください",
            successText: "読み取りました",
        };
        if (myScanner.isAvailable()) {
            this.scannedBarcode = '';
            this.scanedResultId = '';
            this.scanedResultName = '';
            myScanner.beginCapture(scanningOptions)
                .then((result) => {
                    this.scannedBarcode = result.value;
                    const fields = {};
                    fields[SCANED_RESULT_JAN.fieldApiName] = this.scannedBarcode;
                    const recordInput = { apiName: SCANED_RESLT.objectApiName, fields };
                    return createRecord(recordInput);
                })
                .then(scanedResult => {
                    this.debug = JSON.stringify(scanedResult);
                    this.scanedResultId = scanedResult.id;
                    this.scanedResultName = scanedResult.fields.Name.value;
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'ScanedResult created',
                            variant: 'success',
                        }),
                    );
                })
                .catch((error) => {
                    if (error.code != "userDismissedScanner") {
                        const event = new ShowToastEvent({
                            title: 'Scanner Error',
                            message:
                                'An error occurred when scanning barcode. (' + JSON.stringify(error) + ')',
                        });
                        this.dispatchEvent(event);
                    }
                })
                .finally(() => {
                    myScanner.endCapture();
                });
        } else {
            const event = new ShowToastEvent({
                title: 'Scanner not available',
                message:
                    'Not running on hardware with a scanner.',
            });
            this.dispatchEvent(event);
        }
    }

    handleOpenRecord() {
        if (this.scanedResultId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    actionName: 'view',
                    apiName: SCANED_RESLT.objectApiName,
                    recordId: this.scanedResultId
                }
            });
        }
    }
}