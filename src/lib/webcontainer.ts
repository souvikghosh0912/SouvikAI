import { WebContainer, type FileSystemTree } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;

export async function getWebContainer() {
    if (!webcontainerInstance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== 'undefined' && (window as any).__webcontainerInstance) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            webcontainerInstance = (window as any).__webcontainerInstance;
            return webcontainerInstance as WebContainer;
        }
        // Must match the COEP value the document is served with.
        // See next.config.js — we set COEP: credentialless on /code/* so
        // the parent page is cross-origin isolated and SharedArrayBuffer
        // is available, which WebContainer requires to boot.
        webcontainerInstance = await WebContainer.boot({ coep: 'credentialless' });
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__webcontainerInstance = webcontainerInstance;
        }
    }
    return webcontainerInstance;
}

export function parseBuilderFilesToTree(files: Record<string, string>): FileSystemTree {
    const tree: FileSystemTree = {};

    for (const [path, contents] of Object.entries(files)) {
        // Remove leading slash if any
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        const parts = cleanPath.split('/');
        
        let currentLevel = tree;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            // If it's the last part, it's a file
            if (i === parts.length - 1) {
                currentLevel[part] = {
                    file: {
                        contents: contents
                    }
                };
            } else {
                // It's a directory
                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        directory: {}
                    };
                }
                currentLevel = (currentLevel[part] as { directory: FileSystemTree }).directory;
            }
        }
    }

    return tree;
}
