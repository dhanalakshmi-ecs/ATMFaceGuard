from models import db, User, SimulatedTransaction
from utils.security import generate_customer_id, generate_account_number, generate_token
from utils.validators import validate_registration_data

class AuthService:
    """Service handling user registration, authentication, and session token lifecycle."""

    @staticmethod
    def register_user(data: dict) -> tuple[bool, str, dict | None]:
        # Validate payload
        is_valid, err_msg = validate_registration_data(data)
        if not is_valid:
            return False, err_msg, None

        username = data['username'].strip().lower()
        email = data['email'].strip().lower()

        # Check unique constraints
        if User.query.filter_by(username=username).first():
            return False, "Username is already registered. Please choose another username.", None
        if User.query.filter_by(email=email).first():
            return False, "Email address is already registered.", None

        # Generate unique synthetic identifiers
        cust_id = generate_customer_id()
        while User.query.filter_by(customer_id=cust_id).first():
            cust_id = generate_customer_id()

        account_no = generate_account_number()
        while User.query.filter_by(account_number=account_no).first():
            account_no = generate_account_number()

        user = User(
            customer_id=cust_id,
            full_name=data['full_name'].strip(),
            username=username,
            email=email,
            phone=data['phone'].strip(),
            date_of_birth=data.get('date_of_birth', '').strip(),
            account_number=account_no,
            account_type=data.get('account_type', 'Savings'),
            simulated_balance=50000.00,
            is_active=True,
            role=data.get('role', 'customer')
        )
        user.set_password(data['password'])

        db.session.add(user)
        db.session.flush()

        # Initial simulated welcome transaction
        initial_txn = SimulatedTransaction(
            user_id=user.id,
            transaction_type="DEPOSIT",
            amount=50000.00,
            status="COMPLETED",
            description="Initial simulated opening account deposit"
        )
        db.session.add(initial_txn)
        db.session.commit()

        token = generate_token(user.id, user.role)
        return True, "Account registered successfully.", {
            'user': user.to_dict(),
            'token': token
        }

    @staticmethod
    def authenticate_user(identifier: str, password: str) -> tuple[bool, str, dict | None]:
        if not identifier or not password:
            return False, "Username/Email and password are required.", None

        clean_id = identifier.strip().lower()
        user = User.query.filter((User.username == clean_id) | (User.email == clean_id)).first()

        if not user or not user.check_password(password):
            return False, "Invalid username or password.", None

        if not user.is_active:
            return False, "This account is inactive. Please contact customer support.", None

        token = generate_token(user.id, user.role)
        return True, "Authentication successful.", {
            'user': user.to_dict(),
            'token': token
        }
