// ==UserScript==
// @name         Enhanced Auto Form Filler with Navigation
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Auto-fill form fields with editable preview, Next and Previous buttons, and keyboard shortcuts
// @match        https://stable.getautoclicker.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const selectors = [
        "#actions > tbody > tr:nth-child(2) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(6) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(7) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(8) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(10) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(13) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(16) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(20) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(23) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(25) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(28) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(30) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(31) > td:nth-child(5) > div > input",
        "#actions > tbody > tr:nth-child(33) > td:nth-child(5 ) > div > input"
    ];

    const fieldLabels = [
        "Employer", "Surname", "First Name", "Other Name", "Title", "Gender",
        "Marital Status", "Hospital", "Home Address", "State", "LGA", "Phone", "Email", "Date Of Birth"
    ];

    let valuesList = [
        ["SHERWOOD", "OLATUNIDIN", "ADENIYI", "NIL", "MRS", "FEMALE", "MARRIED", "GENERAL HOSPITAL GBAGADA", "1,HOSPITAL ROAD, GBAGADA", "ONDO", "KOSOFE", "8137336277", "OLATUNIDINADENIYI22@GMAIL.COM", "1988-06-22"],
        ["SHERWOOD", "OJEAH", "HELEN", "IFEANYI", "MRS", "FEMALE", "MARRIED", "GENERAL HOSPITAL GBAGADA", "1, HOSPITAL ROAD, GBAGADA", "DELTA", "KOSOFE", "9125825468", "OJEAHHELEN08@GMAIL.COM", "1992-11-14"]
    ];

    let valueSetIndex = parseInt(localStorage.getItem('selectedValueSetIndex')) || 0;

    async function simulateTyping(input, text) {
        input.focus();
        input.value = '';
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        input.setSelectionRange(0, input.value.length);
        document.execCommand('delete');

        for (let char of text) {
            input.value += char;
            input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: char }));
            input.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, key: char }));
            input.dispatchEvent(new InputEvent('input', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: char }));
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        input.value = text;
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function fillFields() {
        const values = valuesList[valueSetIndex];
        const inputs = [];

        for (let i = 0; i < selectors.length; i++) {
            const input = document.querySelector(selectors[i]);
            if (input) {
                inputs.push({ input, value: values[i] || "" });
                await simulateTyping(input, values[i] || "");
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                console.warn(`⚠️ Could not find: ${selectors[i]}`);
            }
        }

        setTimeout(() => {
            for (let { input, value } of inputs) {
                input.value = value;
                input.dispatchEvent(new InputEvent('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }

            watchAndFixField(selectors[12], values[12]);
            watchAndFixField(selectors[13], values[13]);
        }, 400);
    }

    function watchAndFixField(selector, expectedValue) {
        const target = document.querySelector(selector);
        if (!target) return;

        const observer = new MutationObserver(() => {
            if (target.value !== expectedValue) {
                console.warn("🔁 Field changed — restoring value.");
                target.value = expectedValue;
                target.dispatchEvent(new InputEvent('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        observer.observe(target, { attributes: true });

        setTimeout(() => observer.disconnect(), 5000);
    }

    function renderPreview() {
        const previewContainer = document.getElementById('previewTable');
        const values = valuesList[valueSetIndex];

        if (!values || values.length !== selectors.length) {
            previewContainer.innerHTML = "<span style='color: red;'>❌ Invalid or incomplete value set.</span>";
            return;
        }

        let html = "<table style='border-collapse: collapse; width: 100%;'>";
        for (let i = 0; i < fieldLabels.length; i++) {
            const value = values[i] || "";
            const emptyStyle = value.trim() === "" ? "background-color: #ffe0e0;" : "";
            html += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 4px;"><strong>${fieldLabels[i]}</strong></td>
                    <td style="border: 1px solid #ccc; padding: 4px;">
                        <input data-index="${i}" value="${value}" style="width: 100%; ${emptyStyle}" />
                    </td>
                </tr>`;
        }
        html += "</table>";
        previewContainer.innerHTML = html;

        previewContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                valuesList[valueSetIndex][idx] = e.target.value;
                e.target.style.backgroundColor = e.target.value.trim() === "" ? "#ffe0e0" : "";
            });
        });
    }

    function updateIndex(newIndex) {
        valueSetIndex = (newIndex + valuesList.length) % valuesList.length;
        localStorage.setItem('selectedValueSetIndex', valueSetIndex);
        document.getElementById('valueSetSelect').value = valueSetIndex;
        document.querySelector('label[for="valueSetSelect"]').textContent = `Selected Entry: ${valueSetIndex + 1} of ${valuesList.length}`;
        renderPreview();
        fillFields();
    }

    function nextEntry() {
        updateIndex(valueSetIndex + 1);
    }

    function previousEntry() {
        updateIndex(valueSetIndex - 1);
    }

    function createUI() {
        const ui = document.createElement('div');
        ui.style.position = 'fixed';
        ui.style.top = '10px';
        ui.style.left = '10px';
        ui.style.backgroundColor = 'white';
        ui.style.padding = '15px';
        ui.style.border = '1px solid black';
        ui.style.zIndex = '1000';
        ui.style.maxWidth = '350px';
        ui.style.maxHeight = '90vh';
        ui.style.overflowY = 'auto';

        ui.innerHTML = `
            <label for="valueSetSelect">Selected Entry: ${valueSetIndex + 1} of ${valuesList.length}</label>
            <select id="valueSetSelect">
                ${valuesList.map((_, index) => `<option value="${index}" ${index === valueSetIndex ? 'selected' : ''}>Set ${index + 1}</option>`).join('')}
            </select>
            <button id="startButton">Start Filling</button>
            <button id="prevEntryButton">Previous Entry</button>
            <button id="nextEntryButton">Next Entry</button>
            <button id="openLSHSButton">Open LSHS Portal</button>
            <hr />
            <label for="customValueSet">Paste Custom Value Set (JSON format):</label>
            <textarea id="customValueSet" rows="6" cols="35" placeholder='[["Employer","Surname",...], [...]] OR [{"Employer":"...",...}]'></textarea>
            <button id="applyCustomValues">Apply Custom Values</button>
            <p id="feedback" style="color: green;"></p>
            <hr />
            <h4>Preview Current Values:</h4>
            <div id="previewTable" style="font-size: 12px; background: #f9f9f9; border: 1px solid #ccc; padding: 5px;"></div>
        `;

        document.body.appendChild(ui);
        makeDraggable(ui); // ✅ Moved inside where ui is defined

        document.getElementById('valueSetSelect').addEventListener('change', (event) => {
            valueSetIndex = parseInt(event.target.value);
            localStorage.setItem('selectedValueSetIndex', valueSetIndex);
            document.querySelector('label[for="valueSetSelect"]').textContent = `Selected Entry: ${valueSetIndex + 1} of ${valuesList.length}`;
            renderPreview();
            fillFields();
        });

        document.getElementById('startButton').addEventListener('click', fillFields);
        document.getElementById('nextEntryButton').addEventListener('click', nextEntry);
        document.getElementById('prevEntryButton').addEventListener('click', previousEntry);

        document.getElementById('applyCustomValues').addEventListener('click', () => {
            const customText = document.getElementById('customValueSet').value.trim();
            const feedback = document.getElementById('feedback');

            try {
                const parsed = JSON.parse(customText);
                let processed;

                if (Array.isArray(parsed)) {
                    if (typeof parsed[0] === "object" && !Array.isArray(parsed[0])) {
                        processed = parsed.map(obj => fieldLabels.map(label => obj[label] || ""));
                    } else if (Array.isArray(parsed[0])) {
                        processed = parsed.map(set => {
                            while (set.length < selectors.length) set.push("");
                            return set;
                        });
                    } else {
                        throw new Error("Invalid format");
                    }

                    valuesList = processed;
                    valueSetIndex = 0;
                    localStorage.setItem('selectedValueSetIndex', valueSetIndex);

                    const select = document.getElementById('valueSetSelect');
                    select.innerHTML = valuesList.map((_, index) => `<option value="${index}">Set ${index + 1}</option>`).join('');
                    select.value = "0";
                    document.querySelector('label[for="valueSetSelect"]').textContent = `Selected Entry: 1 of ${valuesList.length}`;
                    feedback.style.color = 'green';
                    feedback.textContent = '✅ Custom JSON values applied!';
                    renderPreview();
                    fillFields();
                } else {
                    throw new Error("Parsed JSON is not an array");
                }
            } catch (err) {
                feedback.style.color = 'red';
                feedback.textContent = '❌ Invalid JSON format.';
                console.error("JSON Parse Error:", err);
            }
        });

        document.getElementById('openLSHSButton').addEventListener('click', () => {
            window.open('https://platform.lshsportal.com:7878/Enrollee/Index', '_blank');
        });

        renderPreview();
    }

    function makeDraggable(element) {
        let isDragging = false, offsetX = 0, offsetY = 0;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                element.style.left = (e.clientX - offsetX) + 'px';
                element.style.top = (e.clientY - offsetY) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    window.addEventListener('load', createUI);
})();
