// Shared server-side validation for customer account types.
function businessDetails(body) {
    const type = body.account_type || 'individual';
    const company = String(body.company_name || '').trim();
    const registration = String(body.business_registration || '').trim();

    if (!['individual', 'business'].includes(type) ||
        company.length > 200 || registration.length > 50 ||
        (type === 'business' && !company)) {
        return null;
    }

    return [
        type,
        type === 'business' ? company : null,
        type === 'business' ? registration || null : null
    ];
}

module.exports = { businessDetails };
