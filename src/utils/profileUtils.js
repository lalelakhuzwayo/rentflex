/**
 * Helper function to compute the profile completion percentage and status for a user profile.
 * @param {Object} user - The user object from AuthContext / Supabase profile.
 * @returns {Object} Profile completion metadata
 */
export function getProfileCompletionStatus(user) {
    if (!user) {
        return {
            percentage: 0,
            items: [],
            missingItems: [],
            completedCount: 0,
            totalCount: 6,
            isComplete: false
        };
    }

    const items = [
        {
            id: 'full_name',
            label: 'Full Name',
            weight: 20,
            completed: !!(user.full_name && user.full_name.trim().length > 0)
        },
        {
            id: 'phone',
            label: 'Phone Number',
            weight: 20,
            completed: !!(user.phone && user.phone.trim().length > 0)
        },
        {
            id: 'date_of_birth',
            label: 'Date of Birth',
            weight: 15,
            completed: !!user.date_of_birth
        },
        {
            id: 'id_number',
            label: 'ID or Passport Number',
            weight: 15,
            completed: !!(user.id_number || user.id_verified)
        },
        {
            id: 'employment',
            label: 'Employment & Income Details',
            weight: 15,
            completed: !!(user.employment_status || user.employer_name || user.monthly_income > 0)
        },
        {
            id: 'banking',
            label: 'Payout / Banking Info',
            weight: 15,
            completed: !!(user.bank_name || user.account_number || user.debit_order_enabled)
        }
    ];

    let totalWeight = 0;
    let earnedWeight = 0;

    items.forEach(item => {
        totalWeight += item.weight;
        if (item.completed) {
            earnedWeight += item.weight;
        }
    });

    const percentage = Math.round((earnedWeight / totalWeight) * 100);
    const completedCount = items.filter(i => i.completed).length;
    const missingItems = items.filter(i => !i.completed);
    const isComplete = percentage === 100;

    return {
        percentage,
        items,
        missingItems,
        completedCount,
        totalCount: items.length,
        isComplete
    };
}
