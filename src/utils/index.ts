export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export * from './dateUtils';