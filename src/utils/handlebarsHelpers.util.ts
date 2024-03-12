

export const isAdmin = (user, options) => {
    if (user && user.rol === 'admin') {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
};

export const isNotPremium = (user, options) => {
    if (user && user.rol !== 'premium') {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
};

export const isPremium = (user, options) => {
    if (user && user.rol === 'premium') {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
};

export const categoryName = (categoryMap, categoryId) => {
    return categoryMap && categoryId ? categoryMap[categoryId] || 'Categoría desconocida' : 'Categoría desconocida';
};
