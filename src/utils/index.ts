export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export * from './dateUtils';
export * from './leaseManager';
export * from './userFormatting';