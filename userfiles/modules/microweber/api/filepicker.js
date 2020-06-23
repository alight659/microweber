mw.run = function (c, options) {
    return new mw._Classes[c](options);
};

mw._Classes = {};

mw.CreateClass = function (object) {
    object = object || {};
    var defaults = {
        name: mw.id('class:'),
        options: {},
        require: [],
        build: function () {

        },
        ready: function () {

        }
    };
    this.settings = $.extend({}, defaults, object);
    var scope = this;

    mw.getScripts(this.settings.require, function () {
        mw._Classes[scope.settings.name] = scope.settings.build;
        scope.settings.ready.call();
    });
};

mw.require('uploader.js');


mw.filePicker = function (options) {
    options = options || {};
    var scope = this;
    var $scope = $(this);
    var defaults = {
        components: [
            {type: 'desktop', label: mw.lang('My computer')},
            {type: 'url', label: mw.lang('URL')},
            {type: 'server', label: mw.lang('Uploaded')},
            {type: 'library', label: mw.lang('Media library')}
        ],
        nav: 'tabs', // 'tabs | 'dropdown',
        dropDownTargetMode: 'self', // 'self', 'dialog'
        element: null,
        footer: true,
        okLabel: mw.lang('OK'),
        cancelLabel: mw.lang('Cancel'),
        uploaderType: 'big', // 'big' | 'small'
        confirm: function (data) {

        },
        cancel: function () {

        },
        label: mw.lang('Media')
    };

    this.$root = $('<div class="card mb-3 mw-filepicker-root"></div>');

    this.settings = $.extend(true, {}, defaults, options);

    $.each(this.settings.components, function (i) {
        this['index'] = i;
    });

    this._result = null;

    this.result = function (val) {
        if(typeof val === 'undefined') {
            return this._result;
        }
        this._result = val;
        $scope.trigger('Result', [val]);
    };

    this.components = {
        _$inputWrapper: function (label) {
            var html = '<div class="form-group">' +
                /*'<label>' + label + '</label>' +*/
                '</div>';
            return mw.$(html);
        },
        url: function () {
            var $input = $('<input class="form-control" placeholder="http://example.com/image.jpg">');
            var $wrap = this._$inputWrapper(scope._getComponentObject('url').label);
            $wrap.append($input);
            $input.on('input', function () {
                var val = this.value.trim();
                if(!mw.dialog.get(this)) {
                    scope.setSectionValue(val || null);
                }
            });
            return $wrap[0];
        },
        _setdesktopType: function () {
            var $zone;
            if(scope.settings.uploaderType === 'big') {
                $zone = $('<div class="dropable-zone"> <div class="holder"> <div class="dropable-zone-img"></div><div class="progress progress-silver"> <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 50%;" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div></div><button type="button" class="btn btn-primary btn-rounded">Add file</button> <p>or drop files to upload</p></div></div>');
            } else if(scope.settings.uploaderType === 'small') {
                $zone = $('<div class="dropable-zone small-zone square-zone"> <div class="holder"> <button type="button" class="btn btn-link">Add file</button> <p>or drop file to upload</p> </div> </div>')
            }
            scope.uploaderHolder.empty().append($zone);
        },
        desktop: function () {
            var $wrap = this._$inputWrapper(scope._getComponentObject('desktop').label);
            scope.uploaderHolder = mw.$('<div class="mw-uploader-type-holder"></div>');
            this._setdesktopType();
            $wrap.append(scope.uploaderHolder);
            scope.uploader = mw.upload({
                element: scope.uploaderHolder,
                on: {
                    fileUploaded: function (file) {
                        scope.setSectionValue(file);
                    }
                }
            });
            return $wrap[0];
        },
        server: function () {
            var $wrap = this._$inputWrapper(scope._getComponentObject('server').label);
            /*mw.load_module('files/admin', $wrap, function () {

            }, {'filetype':'images'});*/
            var fr = mw.tools.moduleFrame('files/admin', {'filetype':'images'});
            $wrap.append(fr);
            fr.onload = function () {
                this.contentWindow.$(this.contentWindow.document.body).on('click', '.mw-browser-list-file', function () {
                    var url = this.href;
                    scope.setSectionValue(url);
                });
            };
            return $wrap[0];
        },
        library: function () {
            var $wrap = this._$inputWrapper(scope._getComponentObject('library').label);
            var fr = mw.tools.moduleFrame('pictures/media_library');
            $wrap.append(fr);
            fr.onload = function () {
                this.contentWindow.mw.on.hashParam('select-file', function () {
                    var url = this.toString();
                    scope.setSectionValue(url);
                });
            };
            /*mw.load_module('pictures/media_library', $wrap);*/
            return $wrap[0];
        }
    };

    this.desktopUploaderType = function (type) {
        if(!type) return this.settings.uploaderType;
        this.settings.uploaderType = type;
        this.components._setdesktopType();
    };

    this.settings.components = this.settings.components.filter(function (item) {
        return !!scope.components[item.type];
    });


    this._navigation = null;

    this.navigation = function () {
        this._navigationHeader = document.createElement('div');
        this._navigationHeader.className = 'card-header';
        this._navigationHeader.innerHTML = '<h6><strong>' + this.settings.label + '</strong></h6>';
        this._navigationHolder = document.createElement('div');
        if(this.settings.nav === 'tabs') {
            var ul = $('<ul class="nav nav-xxxxabs" />');
            this.settings.components.forEach(function (item) {
                ul.append('<li class="nav-item"><a class="nav-link active" href="#">'+item.label+'</a></li>')
            });
            this._navigationHolder.appendChild(this._navigationHeader);
            this._navigationHeader.appendChild(ul[0]);
            setTimeout(function () {
                mw.tabs({
                    nav: $('li a', ul),
                    tabs: $('.mw-filepicker-component-section', scope.$root),
                    activeClass: 'btn-primary',
                    onclick: function () {
                        scope.manageActiveSectionState();
                    }
                });
            }, 78);
        } else if(this.settings.nav === 'dropdown') {
            var select = $('<select class="selectpicker form-control" data-title="' + mw.lang('Add file') + '"/>');

            this.settings.components.forEach(function (item) {
                select.append('<option class="nav-item">'+item.label+'</option>');
            });

            this._navigationHolder.appendChild(this._navigationHeader);
            this._navigationHeader.appendChild(select[0]);
            select.on('change', function () {
                var index = this.selectedIndex - 1;
                var items = $('.mw-filepicker-component-section', scope.$root);
                if(scope.settings.dropDownTargetMode === 'dialog' && index > 0) {
                    var temp = document.createElement('div');
                    var item = items.eq(index);
                    item.before(temp);
                    item.show();
                    var footer = false;
                    if (scope._getComponentObject('url').index === index ) {
                        footer =  document.createElement('div');
                        var footerok = $('<button type="button" class="btn btn-primary">' + scope.settings.okLabel + '</button>');
                        var footercancel = $('<button type="button" class="btn btn-light">' + scope.settings.cancelLabel + '</button>');
                        footerok.disabled = true;
                        footer.appendChild(footercancel[0]);
                        footer.appendChild(footerok[0]);
                        footer.appendChild(footercancel[0]);
                        footercancel.on('click', function () {
                            scope.__pickDialog.remove();
                        });
                        footerok.on('click', function () {
                            scope.setSectionValue(val || null);
                            scope.__pickDialog.remove();
                        });
                    }

                    scope.__pickDialog = mw.dialog({
                        overlay: true,
                        content: item,
                        beforeRemove: function () {
                            $(temp).replaceWith(item);
                            item.hide();
                            scope.__pickDialog = null;
                        },
                        footer: footer
                    });
                } else {
                    items.hide().eq(index).show();
                }
                this.value = '';
            });

        }
        this.$root.prepend(this._navigationHolder);

    };

    this.footer = function () {
        if(!this.settings.footer) return;
        this._navigationFooter = document.createElement('div');
        this._navigationFooter.className = 'card-footer';
        this.$ok = $('<button type="button" class="btn btn-primary">' + this.settings.okLabel + '</button>');
        this.$cancel = $('<button type="button" class="btn btn-light">' + this.settings.cancelLabel + '</button>');
        this._navigationFooter.appendChild(this.$cancel[0]);
        this._navigationFooter.appendChild(this.$ok[0]);
        this.$root.append(this._navigationFooter);
        this.$ok[0].disabled = true;
        this.$ok.on('click', function () {
            $(scope).trigger('Result');
        });
    };

    this._getComponentObject = function (type) {
        return this.settings.components.find(function (comp) {
            return comp.type && comp.type === type;
        });
    };

    this._sections = [];
    this.buildComponentSection = function (component) {
        var main = mw.$('<div class="card-body mw-filepicker-component-section"></div>');
        this.$root.append(main);
        this._sections.push(main[0]);
        return main;
    };

    this.buildComponent = function (component) {
        if(this.components[component.type]) {
            return this.components[component.type]();
        }
    };

    this.buildComponents = function () {
        $.each(this.settings.components, function () {
            var component = scope.buildComponent(this);
            if(component){
                var sec = scope.buildComponentSection();
                sec.append(component);
            }
        });
    };

    this.build = function () {
        this.navigation();
        this.buildComponents();
        if(this.settings.nav === 'dropdown') {
            $('.mw-filepicker-component-section', scope.$root).hide().eq(0).show();
        }
        this.footer();
    };

    this.init = function () {
        this.build();
        if (this.settings.element) {
            $(this.settings.element).eq(0).append(this.$root);
        }
        $('select', scope.$root).selectpicker();
    };

    this.activeSection = function () {
        return $(this._sections).filter(':visible')[0];
    };

    this.setSectionValue = function (val) {
        var activeSection = this.activeSection();
        activeSection._filePickerValue = val;
        if(scope.__pickDialog) {
            scope.__pickDialog.remove();
        }
        this.manageActiveSectionState();
    };
    this.manageActiveSectionState = function () {
        // if user provides value for more than one section, the active value will be the one in the current section
        var activeSection = this.activeSection();
        if (activeSection && activeSection._filePickerValue) {
            this.$ok[0].disabled = false;
        } else {
            this.$ok[0].disabled = true;
        }
    };

    this.init();
};