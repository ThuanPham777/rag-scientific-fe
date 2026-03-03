// @ts-nocheck
import { Extension } from '@tiptap/core';
import { defaultSelectionBuilder, yCursorPlugin } from '@tiptap/y-tiptap';

const awarenessStatesToArray = (states: any) => {
    return Array.from(states.entries()).map(([key, value]: any) => {
        return {
            clientId: key,
            ...(value.user || {}),
        };
    });
};
const defaultOnUpdate = () => null;

/**
 * Custom Collaboration Cursor extension for Tiptap v3.
 * The official @tiptap/extension-collaboration-cursor package still uses 'y-prosemirror' internal keys, 
 * which crashes because Tiptap v3 moved to '@tiptap/y-tiptap'. We use the correct plugin here.
 */
export const CustomCollaborationCursor = Extension.create({
    name: 'collaborationCursor',
    addOptions() {
        return {
            provider: null,
            user: {
                name: null,
                color: null,
            },
            render: (user: any) => {
                const cursor = document.createElement('span');
                cursor.classList.add('collaboration-cursor__caret');
                cursor.setAttribute('style', `border-color: ${user.color}`);
                const label = document.createElement('div');
                label.classList.add('collaboration-cursor__label');
                label.setAttribute('style', `background-color: ${user.color}`);
                label.insertBefore(document.createTextNode(user.name), null);
                cursor.insertBefore(label, null);
                return cursor;
            },
            selectionRender: defaultSelectionBuilder,
            onUpdate: defaultOnUpdate,
        };
    },
    onCreate() {
        if (this.options.onUpdate !== defaultOnUpdate) {
            console.warn('[tiptap warn]: DEPRECATED: The "onUpdate" option is deprecated. Please use `editor.storage.collaborationCursor.users` instead. Read more: https://tiptap.dev/api/extensions/collaboration-cursor');
        }
    },
    addStorage() {
        return {
            users: [],
        };
    },
    addCommands() {
        return {
            updateUser: (attributes: any) => () => {
                this.options.user = attributes;
                this.options.provider.awareness.setLocalStateField('user', this.options.user);
                return true;
            },
            user: (attributes: any) => ({ editor }: any) => {
                console.warn('[tiptap warn]: DEPRECATED: The "user" command is deprecated. Please use "updateUser" instead. Read more: https://tiptap.dev/api/extensions/collaboration-cursor');
                return editor.commands.updateUser(attributes);
            },
        };
    },
    addProseMirrorPlugins() {
        return [
            yCursorPlugin((() => {
                this.options.provider.awareness.setLocalStateField('user', this.options.user);
                this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
                this.options.provider.awareness.on('update', () => {
                    this.storage.users = awarenessStatesToArray(this.options.provider.awareness.states);
                });
                return this.options.provider.awareness;
            })(),
                // @ts-ignore
                {
                    cursorBuilder: this.options.render,
                    selectionBuilder: this.options.selectionRender,
                }),
        ];
    },
});
