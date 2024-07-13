/**
 * 
 * @param {*} importModule 
 */
class AutoSelectFile {

    static handleSelectedFile(handlers) {
        if (handlers.selectedFile) {
            var reader = new FileReader();
            // Read file into memory as UTF-8      
            reader.readAsText(handlers.selectedFile);
            // Handle errors load
            reader.onload = handlers.onload;
            reader.onerror = handlers.onError;
        }
    }


    /**
     * 
     * @param {*} content 
     */
    static processData(content, handlers) {
        //initialize the file
        var fileType = handlers.selectedFile.name.split('.')[1];
        var importFormatFn = JImportHelper[fileType];
        if (fileType && importFormatFn) {
            handlers.onSuccess(importFormatFn(content));
        } else {
            handlers.onError("Unsupported File Format");
        }
    }

    static start(handlers) {
        handlers = Object.assign({
            onselect: function() {},
            onSuccess: function() {},
            onError: function() {},
            onload: function loadHandler(event) {
                AutoSelectFile.processData(event.target.result, handlers);
            }
        }, handlers);

        function eventBinder(e) {
            handlers.onselect(this.files[0].name, this.files);
            handlers.selectedFile = this.files[0];
            AutoSelectFile.handleSelectedFile(handlers);
            input.remove();
        }

        var input = document.createElement("input");
        input.type = "file";
        input.addEventListener('change', eventBinder, false);
        // add styling
        input.style.top = "-10000px";
        input.style.position = "absolute";
        document.body.appendChild(input);
        // attach event to document for focus
        window.onfocus = function() {
            setTimeout(function() {
                input.removeEventListener('change', eventBinder);
            }, 1000);
        };
        input.click();

        return ({
            getFile: () =>  handlers.selectedFile,
            getData: () => fileData
        });
    };
}