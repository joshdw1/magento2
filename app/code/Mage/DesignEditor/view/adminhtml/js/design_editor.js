/**
 * Magento
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Academic Free License (AFL 3.0)
 * that is bundled with this package in the file LICENSE_AFL.txt.
 * It is also available through the world-wide-web at this URL:
 * http://opensource.org/licenses/afl-3.0.php
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@magentocommerce.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade Magento to newer
 * versions in the future. If you wish to customize Magento for your
 * needs please refer to http://www.magentocommerce.com for more information.
 *
 * @category    Mage
 * @package     Mage_DesignEditor
 * @copyright   Copyright (c) 2013 X.commerce, Inc. (http://www.magentocommerce.com)
 * @license     http://opensource.org/licenses/afl-3.0.php  Academic Free License (AFL 3.0)
 */

(function($) {

    /**
     * Widget block
     */
    $.widget( "vde.block", { _create: function() {}} );

    /**
     * Widget panel
     */
    $.widget('vde.vde_panel', {
        options: {
            switchModeEvent: 'switchMode',
            loadEvent: 'loaded',
            saveEvent: 'save',
            saveAndAssignEvent: 'save-and-assign',
            cellSelector: '.vde_toolbar_cell',
            handlesHierarchySelector: '#vde_handles_hierarchy',
            treeSelector: '#vde_handles_tree',
            viewLayoutButtonSelector: '.view-layout',
            navigationModeButtonSelector: '.switch-to-navigation',
            viewLayoutUrl: null,
            editorFrameSelector: null
        },
        editorFrame: null,

        _create: function() {
            this._initCells();
            this._initViewLayoutButton();
            this._bind();
        },

        /**
         * Bind handlers
         * @protected
         */
        _bind: function() {
            var $body = $('body');
            $body.on(this.options.switchModeEvent, $.proxy(this._onSwitchMode, this));
            $body.on(this.options.loadEvent, function() {
                $body.trigger('contentUpdated');
            });
            $body.on(this.options.saveEvent, $.proxy(this._onSave, this));
            $body.on(this.options.saveAndAssignEvent, $.proxy(this._onSaveAndAssign, this));
        },

        _initCells : function() {
            var self = this;
            this.element.find( this.options.cellSelector ).each( function(){
                $( this ).is( self.options.handlesHierarchySelector ) ?
                    $( this ).vde_menu( {treeSelector : self.options.treeSelector, slimScroll:true } ) :
                    $( this ).vde_menu();
            });
            this.element.find( this.options.cellSelector ).vde_menu();
        },

        _initViewLayoutButton: function() {
            var button = $(this.options.viewLayoutButtonSelector);
            this.options.viewLayoutUrl = button.attr('href');
            button.bind(
                'click', $.proxy(this._onViewLayoutButtonClick, this)
            );
        },

        /**
         * Switch mode event handler
         * @protected
         */
        _onSwitchMode: function(event, data) {
            if ('save_changes_url' in data) {
                this.saveTemporaryLayoutChanges(data.theme_id, data.save_changes_url, data.mode_url)
            } else {
                document.location = data.mode_url;
            }
        },

        _onViewLayoutButtonClick: function(e) {
            try {
                var historyObject = $(this.options.editorFrameSelector).get(0).contentWindow.vdeHistoryObject;
                if (historyObject.getItems().length == 0) {
                    /** @todo temporary report */
                    alert($.mage.__('No changes found.'));
                    return false;
                }
                var data = this._preparePostItems(historyObject.getItems());
                var compactXml = this._post(this.options.viewLayoutUrl, data);
                alert(compactXml);
            } catch (e) {
                alert(e.message);
            } finally {
                return false;
            }
        },

        _onSave: function(event, eventData) {
            if (eventData.confirm_message && !confirm(eventData.confirm_message)) {
                return;
            }
            if (!eventData.save_url) {
                throw Error('Save url is not defined');
            }

            var data = {
                themeId: eventData.theme_id
            };

            var onSaveSuccess = eventData.onSaveSuccess || function(response) {
                if (response.error) {
                    alert($.mage.__('Error') + ': "' + response.message + '".');
                } else {
                    alert(response.message);
                }
            };

            if ($(this.options.editorFrameSelector).get(0)) {
                var historyObject = $(this.options.editorFrameSelector).get(0).contentWindow.vdeHistoryObject;
                if (historyObject && historyObject.getItems().length != 0) {
                    data.layoutUpdate = this._preparePostItems(historyObject.getItems());
                }
                var frameUrl = $(this.options.editorFrameSelector).attr('src');
                var urlParts = frameUrl.split('handle');
                if (urlParts.length > 1) {
                    data.handle = frameUrl.split('handle')[1].replace(/\//g, '');
                }
            }

            $.ajax({
                type: 'POST',
                url:  eventData.save_url,
                data: data,
                dataType: 'json',
                success: $.proxy(onSaveSuccess, this),
                error: function() {
                    alert($.mage.__('Error: unknown error.'));
                }
            });
        },

        _onSaveAndAssign: function(event, eventData) {
            //NOTE: Line below makes copy of eventData to have an ability to unset 'confirm_message' later
            // and to not miss this 'confirm_message' for next calls of method
            var tempData = jQuery.extend({}, eventData);

            if (tempData.confirm_message && !confirm(tempData.confirm_message)) {
                return;
            }
            tempData.confirm_message = null;
            tempData.onSaveSuccess = function(response) {
                if (response.error) {
                    alert($.mage.__('Error') + ': "' + response.message + '".');
                }
            }
            $(event.target).trigger('save', tempData);
            $(event.target).trigger('assign', tempData);
        },

        saveTemporaryLayoutChanges: function(themeId, saveChangesUrl, modeUrl) {
            try {
                var historyObject = $(this.options.editorFrameSelector).get(0).contentWindow.vdeHistoryObject;
                if (historyObject.getItems().length != 0) {
                    var frameUrl = $(this.options.editorFrameSelector).attr('src');
                    var data = {
                        theme_id: themeId,
                        layoutUpdate: this._preparePostItems(historyObject.getItems()),
                        handle: frameUrl.split('/handle/')[1].replace(/\//g, '')
                    };
                    $.post(saveChangesUrl, data, function() {
                        document.location = modeUrl;
                    });
                } else {
                    document.location = modeUrl;
                }
            } catch (e) {
                alert(e.message);
            }
        },

        _preparePostItems: function(items) {
            var postData = {};
            $.each(items, function(index, item){
                postData[index] = item.getPostData();
            });
            return postData;
        },
        _post: function(action, data) {
            var url = action;
            var postResult;
            $.ajax({
                url: url,
                type: 'POST',
                dataType: 'JSON',
                data: {historyData: data},
                async: false,
                success: function(data) {
                    if (data.error) {
                        /** @todo add error validator */
                        throw Error($.mage.__('Some problem with save action'));
                        return;
                    }
                    postResult = data.success;
                },
                error: function(data) {
                    throw Error($.mage.__('Some problem with save action'));
                }
            });
            return postResult;
        },
        _destroy: function() {
            this.element.find( this.options.cellSelector ).each( function(i, element) {
                $(element).data('vde_menu').destroy();
            });
            this._super();
        }
    });

    /**
     * Widget page
     */
    $.widget('vde.vde_page', {
        options: {
            frameSelector: 'iframe#vde_container_frame',
            containerSelector: '.vde_element_wrapper.vde_container',
            panelSelector: '#vde_toolbar_row',
            highlightElementSelector: '.vde_element_wrapper',
            highlightElementTitleSelector: '.vde_element_title',
            highlightCheckboxSelector: '#vde_highlighting'
        },
        editorFrame: null,
        _create: function () {
            var self = this;
            $(this.options.frameSelector).load(function() {
                self.editorFrame = $(this).contents();
                self._initPanel();
            });
            this._bind();
            this._initFrame();
        },
        _initPanel: function () {
            $(this.options.panelSelector).vde_panel({
                editorFrameSelector: this.options.frameSelector
            })
        },
        _bind: function() {
            $(window).on('resize', $.proxy(this._resizeFrame, this));
        },
        _resizeFrame: function() {
            if ($(this.options.frameSelector).length) {
                var height = $(window).innerHeight();
                var offset = $(this.options.frameSelector).offset();
                $(this.options.frameSelector).height(height - parseInt(offset.top) - 5);
            }
        },
        _initFrame: function() {
            this._resizeFrame();
        }
    });

    /**
     * Widget page highlight functionality
     */
    var pageBasePrototype = $.vde.vde_page.prototype;
    $.widget('vde.vde_page', $.extend({}, pageBasePrototype, {
        _create: function () {
            pageBasePrototype._create.apply(this, arguments);
            if (this.options.highlightElementSelector) {
                this._initHighlighting();
                this._bind();
            }
        },
        _bind: function () {
            pageBasePrototype._bind.apply(this, arguments);
            var self = this;
            this.element
                .on('checked.vde_checkbox', function () {
                    self._highlight();
                })
                .on('unchecked.vde_checkbox', function () {
                    self._unhighlight();
                });
        },
        _initHighlighting: function () {
            if (this.options.highlightCheckboxSelector) {
                $(this.options.highlightCheckboxSelector)
                    .vde_checkbox();
            }

            this.frameChanged = false;
            var self = this;
            $(this.options.frameSelector).load(function() {
                self.highlightBlocks = {};
                if (self.frameChanged) {
                    $(self.options.highlightCheckboxSelector).vde_checkbox('setChecked');
                } else {
                    self.frameChanged = true;
                }
            });
        },
        _highlight: function () {
            var self = this;
            this.editorFrame.find(this.options.highlightElementSelector).each(function () {
                $(this)
                    .append(self._getChildren($(this).attr('id')))
                    .show()
                    .children(self.options.highlightElementTitleSelector).slideDown('fast');
            });
            this.highlightBlocks = {};
        },
        _unhighlight: function () {
            var self = this;
            this.editorFrame.find(this.options.highlightElementSelector).each(function () {
                var elem = $(this);
                elem.children(self.options.highlightElementTitleSelector).slideUp('fast', function () {
                    var children = elem.contents(':not(' + self.options.highlightElementTitleSelector + ')');
                    var parentId = elem.attr('id');
                    children.each(function () {
                        self._storeChild(parentId, this);
                    });
                    elem.after(children).hide();
                });
            });
        },
        _storeChild: function(parentId, child) {
            if (!this.highlightBlocks[parentId]) {
                this.highlightBlocks[parentId] = [];
            }
            this.highlightBlocks[parentId].push(child);
        },
        _getChildren: function(parentId) {
            return (!this.highlightBlocks[parentId]) ? [] : this.highlightBlocks[parentId];
        }
    }));

    $( document ).ready(function( ) {
        var body = $('body');
        var frames = $('iframe#vde_container_frame');

        body.on('refreshIframe', function() {
            frames[0].contentWindow.location.reload(true);
        });
    });

})( jQuery );
