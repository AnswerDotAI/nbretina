define([
  "notebook/js/textcell","base/js/markdown"
], function(textcell, markdown) {
    function patchMdRender() {
      textcell.MarkdownCell.prototype.render = function () {
        this.drag_counter = 0;
        this.inner_cell.removeClass('dropzone');
        if (!textcell.TextCell.prototype.render.apply(this)) return;
        var that = this;
        markdown.render(this.get_text() || this.placeholder,
            { with_math: true, clean_tables: true, sanitize: true },
            function (err, html) {
            html.find('img[src^="attachment:"]').each(function (i, h) {
                h = $(h);
                var key = h.attr('src').replace(/^attachment:/, '');
                if (that.attachments.hasOwnProperty(key)) {
                    var att = that.attachments[key];
                    var mime = Object.keys(att)[0];
                    var dataUrl = `data:${mime};base64,${att[mime]}`;
                    h.attr('srcset', dataUrl + ' 2x');
                    //h.attr('src', dataUrl);
                    var attrs = h.parent().text().match(/\{(.+?)\}/);
                    if (attrs) {
                        var attrString = attrs[1];
                        var regex = /(\w+)=(?:"([^"]*)"|([\w%]+))/g;
                        var match;
                        while ((match = regex.exec(attrString)) !== null) {
                            var key = match[1];
                            var value = match[2] || match[3];
                            h.attr(key, value);
                        }
                    }
                    h.parent().contents().filter(
                        (_, el) => el.nodeType === 3 && el.nodeValue.trim().match(/^\{.*\}$/)
                    ).remove();
                } else h.attr('src', '');
            });
            that.set_rendered(html);
            that.typeset();
            that.events.trigger("rendered.MarkdownCell", {cell: that});
        });
      };
    }

    return { load_ipython_extension: patchMdRender };
});

