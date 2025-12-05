/**
 * src/ui/editor/ui/selection.js
 * Selection Visual Management
 */

export const SelectionMixin = {
    refreshSelectionVisuals() {
        document.querySelectorAll('.editor-selected').forEach(el => el.classList.remove('editor-selected'));
        
        // Highlight all selected items
        this.selectedItems.forEach(item => {
            const el = document.getElementById(`btn-${item.id}`);
            if (el) {
                el.classList.add('editor-selected');
                el.setAttribute('data-editor-title', item.title || item.id);
            }
        });

        if (this.activeTab === 'choice') {
            this.updateChoiceInputs();
        }
    }
};