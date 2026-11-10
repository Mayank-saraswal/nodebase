"use client";

import { useState, useRef, useEffect } from "react";
import { ChatPanel } from "./chat-panel";
import { BotIcon, XIcon } from "lucide-react";
import { GeneratedWorkflow } from "../schemas/workflow-generation";

interface FloatingChatPanelProps {
  workflowId?: string;
  currentNodes?: any[];
  currentEdges?: any[];
  onWorkflowGenerated?: (workflow: GeneratedWorkflow, generationId: string) => void;
}

export function FloatingChatPanel({ workflowId, currentNodes, currentEdges, onWorkflowGenerated }: FloatingChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 }); 
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 p-4 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 flex items-center justify-center"
      >
        <BotIcon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      style={{ left: position.x, top: position.y }}
      className="absolute z-50 flex flex-col w-[400px] h-[600px] bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-3 bg-muted/50 border-b border-border cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BotIcon className="w-4 h-4 text-primary" />
          Nodebase AI Assistant
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatPanel 
          workflowId={workflowId}
          currentNodes={currentNodes}
          currentEdges={currentEdges}
          onWorkflowGenerated={onWorkflowGenerated} 
        />
      </div>
    </div>
  );
}
