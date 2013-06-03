# Backbone.ChromeStorage

A [chrome.storage.*][cs] adapter for Backbone.js, largely inspired by [Backbone.localStorage][bbls] but reworked for use in writing extensions for the Chrome browser.

The asynchronous nature of Chrome's storage API is handled with [$.Deferred][dfd] objects wrapped around its methods, which allows for essentially the same flexibility that is provided by AJAX requests, e.g.:

    collection.fetch().then(
        // done callback
        function() {
            console.log('do something once collection is fetched');
        },
        // fail callback
        function(dfd, errText, lastError /* from chrome.runtime.lastError */) {
            console.warn("Problem fetching from chromeStorage '%s'", errText);
        }
    );


Backbone.ChromeStorage supports AMD/RequireJS, but it will work without it.

## Usage
Usage is much the same as with localStorage, with the addition of
an extra (optional) argument that specifies which _type_ of storage to use:

    var SomeCollection = Backbone.Collection.extend({
        chromeStorage: new Backbone.ChromeStorage("SomeCollection", "sync");
        // everything else is the same
    });

For storage that will persist across every browser a user has synchronized, use `"sync"`. For storage that will persist only in the current browser, much like localStorage, use `"local"`.

If a type is not provided, it will default to `"local"`. To change the default, use `Backbone.ChromeStorage.defaultType`.

If a user has disabled Chrome's synchronization features, `"sync"` will automatically fall back to `"local"` without issue.

## Caveats

### zepto.js support

Backbone.ChromeStorage will work just fine with Zepto instead of jQuery, but as it requires deferred objects, you will need to use something like the excellent [simply-deferred].

### Backbone.localStorage

Because they both modify globals, Backbone.ChromeStorage and Backbone.localStorage will not play nice together. Using the 'local' type for ChromeStorage is effectively the same as localStorage if you wish to mix the two.

### "sync" storage and throttling
Chrome's rate-limiting and quota restrictions on `"sync"` storage are presently handled by `$.Deferred().reject()`, with `chrome.runtime.lastError` being passed to any fail callbacks as the third argument. A future version will handle this more elegantly.

## Changelog
* **2013 / 06 / 03**
    - Don't stringify objects when persisting (Issue #5)

## Contributors
* @nigggle


## License
Released under MIT license

Copyright (c) 2012-2013 Alexandra Grey

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[cs]: https://developer.chrome.com/extensions/storage.html "chrome.storage documentation"
[dfd]: http://api.jquery.com/category/deferred-object/ "$.Deferred documentation"
[bbls]: https://github.com/jeromegn/Backbone.localStorage
[simply-deferred]: https://github.com/sudhirj/simply-deferred "Simply Deferred"