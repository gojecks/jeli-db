/**
 * 
 * @param {*} importModule 
 */
function AutoSelectFile(importModules) {
    var handler = {
        onselect: function() {},
        onSuccess: function() {},
        onError: function() {},
        onload: function loadHandler(event) {
            processData(event.target.result);
        },
        selectedFile: null
    };


    /**
     * 
     * @param {*} content 
     */
    function processData(content) {
        //initialize the file
        var fileType = handler.selectedFile.name.split('.')[1],
            importModule = new importModules(fileType);
        if (fileType && importModule[fileType]) {
            handler.onSuccess(importModule[fileType](content));
        } else {
            handler.onError("Unsupported File Format");
        }
    }

    function handleSelectedFile() {
        if (handler.selectedFile) {
            var reader = new FileReader();
            // Read file into memory as UTF-8      
            reader.readAsText(handler.selectedFile);
            // Handle errors load
            reader.onload = handler.onload;
            reader.onerror = handler.onError;
        }

    }

    this.start = function(handlers) {
        if (handlers) {
            handler = extend(handler, handlers);
        }

        function eventBinder(e) {
            handler.onselect(this.files[0].name, this.files);
            handler.selectedFile = this.files[0];
            handleSelectedFile();
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
            getFile: function() {
                return handler.selectedFile;
            },
            getData: function() {
                return fileData;
            }
        });
    };
}