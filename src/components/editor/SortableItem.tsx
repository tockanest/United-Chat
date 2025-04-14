import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { ChevronRight, Folder, PaintBucket } from 'lucide-react';
import { Button } from '../ui/button';

interface SortableItemProps {
    id: string;
    type: 'theme' | 'folder';
    name: string;
    isSelected?: boolean;
    lastEdit?: Date;
    isOpen?: boolean;
    onSelect: () => void;
    onToggle?: () => void;
}

export function SortableItem({
    id,
    type,
    name,
    isSelected,
    lastEdit,
    isOpen,
    onSelect,
    onToggle,
}: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        data: {
            type,
            name
        }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
    };

    const buttonContent = (
        <>
            {type === 'folder' ? (
                <>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    <Folder className="h-4 w-4" />
                </>
            ) : (
                <PaintBucket className="h-4 w-4" />
            )}
            <div className="flex flex-col items-start">
                <span>{name.slice(0, 1).toUpperCase() + name.slice(1)}</span>
                {lastEdit && (
                    <span className="text-xs text-muted-foreground">
                        Last edited: {format(lastEdit, 'MMM d, yyyy')}
                    </span>
                )}
            </div>
        </>
    );

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="w-full">
            <Button
                variant={isSelected ? "secondary" : "ghost"}
                className="w-full justify-start gap-2 p-2 h-auto"
                onClick={type === 'folder' ? onToggle : onSelect}
            >
                {buttonContent}
            </Button>
        </div>
    );
} 