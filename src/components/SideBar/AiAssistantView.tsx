import React from 'react';
import { CompilloAiView, CompilloAiViewProps } from './CompilloAiView';

export type AiAssistantViewProps = CompilloAiViewProps;

export const AiAssistantView: React.FC<AiAssistantViewProps> = (props) => {
  return <CompilloAiView {...props} />;
};

export { CompilloAiView };
