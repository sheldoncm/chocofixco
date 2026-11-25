// LEARNING NOTE: Reusable controlled component using props.
export default function BusinessFields({ values, onChange }) {
  return (
    <div className="cf-business-fields">
      <label htmlFor="account_type">Account type</label>
      <select id="account_type" name="account_type"
        className="form-select mb-3"
        value={values.account_type || 'individual'}
        onChange={onChange}>
        <option value="individual">Individual</option>
        <option value="business">Business</option>
      </select>

      {values.account_type === 'business' && (
        <>
          <label htmlFor="company_name">Company name</label>
          <input id="company_name" name="company_name"
            className="form-control mb-3"
            value={values.company_name || ''}
            onChange={onChange} maxLength={200} required />

          <label htmlFor="business_registration">
            UEN / Business registration number (optional)
          </label>
          <input id="business_registration"
            name="business_registration"
            className="form-control mb-3"
            value={values.business_registration || ''}
            onChange={onChange} maxLength={50} />
        </>
      )}
    </div>
  )
}
