from flask import Blueprint, request, jsonify
from models import db, SimulatedTransaction
from utils.security import token_required

transaction_bp = Blueprint('transaction_bp', __name__, url_prefix='/api/transactions')

@transaction_bp.route('/history', methods=['GET'])
@token_required
def get_user_transactions(current_user):
    """Retrieves simulated transaction statement."""
    txns = SimulatedTransaction.query.filter_by(user_id=current_user.id)\
        .order_by(SimulatedTransaction.created_at.desc())\
        .limit(50)\
        .all()
    return jsonify({
        'success': True,
        'count': len(txns),
        'data': [t.to_dict() for t in txns]
    }), 200

@transaction_bp.route('/simulate', methods=['POST'])
@token_required
def simulate_atm_action(current_user):
    """Simulates an authorized ATM banking action (e.g. withdrawal or deposit)."""
    data = request.get_json(silent=True) or {}
    action_type = data.get('type', 'WITHDRAWAL').upper()
    amount = float(data.get('amount', 0.0))

    if amount <= 0:
        return jsonify({'success': False, 'message': 'Amount must be greater than zero.'}), 400

    if action_type == 'WITHDRAWAL':
        if current_user.simulated_balance < amount:
            return jsonify({
                'success': False,
                'message': f'Insufficient simulated balance. Available: ${current_user.simulated_balance:,.2f}'
            }), 400
        current_user.simulated_balance -= amount
        desc = f"Simulated ATM cash withdrawal"
    elif action_type == 'DEPOSIT':
        current_user.simulated_balance += amount
        desc = f"Simulated ATM deposit"
    else:
        return jsonify({'success': False, 'message': 'Supported actions: WITHDRAWAL, DEPOSIT.'}), 400

    txn = SimulatedTransaction(
        user_id=current_user.id,
        transaction_type=action_type,
        amount=amount,
        status="COMPLETED",
        description=desc
    )
    db.session.add(txn)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f"{action_type.capitalize()} of ${amount:,.2f} completed successfully.",
        'new_balance': current_user.simulated_balance,
        'transaction': txn.to_dict()
    }), 200
