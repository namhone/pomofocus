import React, { useCallback, useRef } from 'react';

/** Release DOM references without stopping tracks shared by the room's other views. */
export const RoomStreamMedia: React.FC<{
  stream: MediaStream | null | undefined;
  kind: 'video' | 'audio';
  className?: string;
}> = ({ stream, kind, className }) => {
  const element = useRef<HTMLMediaElement | null>(null);
  const attach = useCallback((node: HTMLMediaElement | null) => {
    if (element.current && element.current !== node) element.current.srcObject = null;
    element.current = node;
    if (node) node.srcObject = stream || null;
  }, [stream]);

  return kind === 'video'
    ? <video ref={attach} autoPlay playsInline muted className={className} />
    : <audio ref={attach} autoPlay playsInline className={className} />;
};
