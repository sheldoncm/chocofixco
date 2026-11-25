import { useState } from 'react'

// LEARNING NOTE: REUSABLE COMPONENTS AND PROPS
// The parent supplies labels, values and event handlers.
// Controlled inputs receive their values from React state.
// Local useState controls password visibility independently
// for each instance of this reusable component.

export default function FormInput(props) {
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = props.type === 'password'

  return (
    <div className="mb-3">
      <label htmlFor={props.id} className="form-label">
        {props.label}
      </label>

      <div className={isPassword ? 'password-field' : undefined}>
        <input
          id={props.id}
          name={props.id}
          type={
            isPassword && showPassword
              ? 'text'
              : props.type || 'text'
          }
          className="form-control"
          value={props.value}
          onChange={props.onChange}
          required={props.required}
          autoComplete={props.autoComplete}
          maxLength={props.maxLength}
          minLength={props.minLength}
          readOnly={props.readOnly}
        />

        {isPassword && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(previous => !previous)}
            aria-label={
              showPassword ? 'Hide password' : 'Show password'
            }
            title={
              showPassword ? 'Hide password' : 'Show password'
            }
            aria-controls={props.id}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
              {showPassword && <path d="M3 3l18 18" />}
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
