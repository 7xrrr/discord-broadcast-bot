// ==UserScript==
// @name         Discord Token Grabber Button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a button to extract the Discord token By Euiz Dev
// @author       Euiz Dev
// @match        https://discord.com/channels/@me
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

  
    document.addEventListener('wheel', function (event) {
        if (event.ctrlKey) {
            event.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && (event.key === '+' || event.key === '-' || event.key === '0')) {
            event.preventDefault();
        }
    });

    
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(function () {
            console.log('Token copied to clipboard');
        }, function (err) {
            console.error('Failed to copy token: ', err);
        });
    }


    var button = document.createElement('button');
    button.innerText = 'Get Discord Token';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9999';
    button.style.padding = '10px';
    button.style.background = '#4956B0';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.borderRadius = '5px';


    document.body.appendChild(button);


    button.onclick = function () {
     
        if (!window.webpackChunkdiscord_app) {
            console.error('webpackChunkdiscord_app is not available');
            alert('Failed to grab token: webpackChunkdiscord_app is not available');
            return;
        }

 
        window.webpackChunkdiscord_app.push([
            [Math.random()],
            {},
            req => {
                if (!req.c) return;
                for (const m of Object.keys(req.c)
                    .map(x => req.c[x].exports)
                    .filter(x => x)) {
                    if (m.getToken !== undefined) {
                        const token = m.getToken();
                        copyToClipboard(token);
                        alert('Token grabbed and copied to clipboard [Script by Euiz Dev]');
                        return;
                    }
                }
            },
        ]);

  
        window.webpackChunkdiscord_app.pop();
    };
})();