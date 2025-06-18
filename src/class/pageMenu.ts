import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { MessageSelectOptionData } from "discord.js-selfbot-v13";
import { chunk } from "../utils/tools.js";
interface extraButton {
    button: ButtonBuilder;
    index: number; // Index of the button in the action row
}



export class pageMenu {
    public options: MessageSelectOptionData[] = [];
    public selected: string[] = null;
    public page: number = 0;
    public perPageLimit: number = 10;
    public extraButtons: extraButton[] = []; // Array to hold extra buttons if needed
    public menu = {
        customId: "pageMenu",
        placeholder: "Select an option",
        maxValues: 1,
        minValues: 1,
    }
    constructor(options: MessageSelectOptionData[]) {
        this.setOptions(options);
        this.setPerPageLimit(25); // Default limit
        this.setPage(0); // Start at page 0
        this.setSelected(this.options.filter(o => o.default).map(o => o.value)); // Set selected options based on default
    }
    setCustomId(customId: string) {
        this.menu.customId = customId;
    }
    setPlaceholder(placeholder: string) {
        this.menu.placeholder = placeholder;
    }

    setOptions(options: MessageSelectOptionData[]) {
        this.options = options;
    }
    setPerPageLimit(limit: number) {
        this.perPageLimit = limit;
        if (this.perPageLimit <= 0) {
            this.perPageLimit = 10; // Default limit
        }
    }
    setSelected(selected: string[]) {
        this.selected = selected;
    }
    setMinValues(minValues: number) {

        this.menu.minValues = minValues === 99 ? this.options.length > 25 ? 25 : this.options.length : minValues

    }
    setMaxValues(maxValues: number) {
        this.menu.maxValues = maxValues === 99 ? this.options.length > 25 ? 25 : this.options.length : maxValues;
    }
    setExtraButtons(buttons: extraButton[]) {
        this.extraButtons = buttons;
    }

    public nextButton = {
        label: "Next",
        customId: "next",
        style: ButtonStyle.Secondary,
        disabled: false, // Initially disabled, will be enabled based on page
        description: "Go to the next page",
        emoji: "➡️"
    }
    public previousButton = {
        label: "Previous",
        style: ButtonStyle.Secondary,
        customId: "previous",
        description: "Go to the previous page",
        disabled: false, // Initially disabled, will be enabled based on page
        emoji: "⬅️"
    }

    get maxPages() {
      
        return Math.ceil(this.options.length / this.perPageLimit);
    }
    nextPage() {
        this.setPage(this.page + 1);
    }
    previousPage() {
        this.setPage(this.page - 1);
    }
    setPage(page: number) {

        this.page = page;
        if (this.page > this.maxPages) {
            this.page = this.maxPages;
        }
        if (this.page < 0) {
            this.page = 0;
        }
    }
    getSpeficPage(page: number): MessageSelectOptionData[] {
        if (page < 0 || page >= this.maxPages) {
            return [];
        }
        const start = page * this.perPageLimit;
        const end = start + this.perPageLimit;
        return this.options.slice(start, end).map(option => {
            return {
                label: option.label,
                value: option.value,
                description: option.description || "",
                emoji: option.emoji || undefined,
                default: this.selected?.includes(option.value) || false
            };
        });
    }
    setNextPageButton(config: {
        label?: string,
        value?: string,
        description?: string,
        style?: "Primary" | "Secondary" | "Success" | "Danger",
        emoji?: string,
        disabled?: boolean
    }) {
        this.nextButton.label = config.label || this.nextButton.label;
        this.nextButton.customId = config.value || this.nextButton.customId;
        this.nextButton.description = config.description || this.nextButton.description;
        this.nextButton.emoji = config.emoji || this.nextButton.emoji;
        this.nextButton.disabled = config?.disabled === true
    }
    setPreviousPageButton(config: {
        label?: string,
        value?: string,
        style?: "Primary" | "Secondary" | "Success" | "Danger",
        description?: string,
        emoji?: string,
        disabled?: boolean
    }) {
        this.previousButton.label = config.label || this.previousButton.label;
        this.previousButton.customId = config.value || this.previousButton.customId;
        this.previousButton.description = config.description || this.previousButton.description;
        this.previousButton.emoji = config.emoji || this.previousButton.emoji;
        this.previousButton.disabled = config?.disabled === true
        if (config.style && ButtonStyle[config.style]) {
            this.previousButton.style = ButtonStyle[config.style];
        }
    }
    buildNextButton(): ButtonBuilder {
        const disabled = this.page >= this.maxPages - 1 || this.nextButton.disabled;
        const button = new ButtonBuilder()
        if (this.nextButton.label) {
            button.setLabel(this.nextButton.label);
        }
        button.setCustomId(this.nextButton.customId)
        button.setStyle(this.nextButton.style);
        if (this.nextButton.emoji) {
            button.setEmoji(this.nextButton.emoji);
        }
        button.setDisabled(disabled);
        return button
    }
    buildPreviousButton(): ButtonBuilder {
        const disabled = this.page <= 0 || this.previousButton.disabled;
        const button = new ButtonBuilder()
        if (this.previousButton.label) {
            button.setLabel(this.previousButton.label);
        }
        button.setCustomId(this.previousButton.customId)
        button.setStyle(this.previousButton.style);
        if (this.previousButton.emoji) {
            button.setEmoji(this.previousButton.emoji);
        }
        button.setDisabled(disabled);


        return button
    }


    get currentPageOptions(): MessageSelectOptionData[] {
        // Step 1: Prioritize selected options
        return this.getSpeficPage(this.page);
    }
    get selectedOptions(): MessageSelectOptionData[] {
        if (!this.selected || this.selected.length === 0) {
            return [];
        }
        return this.currentPageOptions.filter(option => this.selected?.includes(option.value));
    }





    build() {
        const components: any[] = [];
        // Build select menu
        const menu = new StringSelectMenuBuilder()
            .setCustomId(this.menu.customId)
            .setPlaceholder(this.menu.placeholder)
            .setMaxValues(this.menu.maxValues)
            .setMinValues(this.menu.minValues)
            .addOptions(this.currentPageOptions);

        components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));

        // Build buttons
        const buttons: ButtonBuilder[] = [];

        if (this.maxPages > 1) {
            buttons.push(this.buildPreviousButton());
            buttons.push(this.buildNextButton());
        }

        for (const { index, button } of this.extraButtons) {
            if (typeof index === "number" && index >= 0 && index < buttons.length) {
                buttons.splice(index, 0, button); // Insert at index, shifting others
            } else {
                buttons.push(button); // Append if index is out of bounds
            }
        }
        // Add buttons to action rows (max 5 per row, max 5 rows)
        if (buttons.length > 0) {
            const rows = chunk(buttons, 5).slice(0, 4); // Max 5 action rows per message

            for (const row of rows) {
                components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...row));
            }
        }

        return components;
    }
}