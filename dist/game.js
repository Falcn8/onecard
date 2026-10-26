export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const ON_CHECK = [1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1];
export const ON_BET = [0, 0, 0, .251, .408, .583, .759, 1, 1, 1, 1, 1, 1];
export const FIRST_BET = [.454, .443, .254, 0, 0, 0, 0, .422, .549, .598, .615, .628, .641];
export const CALL_RAISE = [0, 0, .169, .269, .429, .610, .760, 1, 1, 1, 1, 1, 1];

export function emptySession() { return { money: 0, hands: 0, wins: 0, history: [] }; }

export class PokerGame {
  constructor(session = emptySession(), rng = Math.random) {
    this.rng = rng;
    this.session = structuredClone(session);
    this.phase = 'idle';
    this.player = null;
    this.opponent = null;
    this.playerStake = 0;
    this.opponentStake = 0;
    this.opener = this.nextOpener;
    this.playerAction = null;
    this.computerAction = null;
    this.revealed = false;
    this.log = [];
    this.outcome = null;
  }
  get pot() { return this.playerStake + this.opponentStake; }
  get nextOpener() {
    const previous = this.session.history[0]?.opener;
    if (previous === 'computer') return 'player';
    if (previous === 'player') return 'computer';
    return this.session.hands > 0 ? 'computer' : 'player';
  }
  deal() {
    if (!['idle', 'complete'].includes(this.phase)) return false;
    this.player = Math.floor(this.rng() * 13);
    const other = Math.floor(this.rng() * 12);
    this.opponent = other >= this.player ? other + 1 : other;
    this.playerStake = this.opponentStake = 1;
    this.opener = this.nextOpener;
    this.phase = this.opener === 'player' ? 'decision' : 'thinking';
    this.revealed = false;
    this.outcome = null;
    this.pending = this.opener === 'computer' ? 'open' : null;
    this.playerAction = null;
    this.computerAction = null;
    this.log = ['You and the computer each ante $1.'];
    return true;
  }
  act(action) {
    if (this.phase === 'decision' && ['check', 'bet'].includes(action)) {
      this.playerAction = action;
      this.log.push(action === 'check' ? 'You check. No additional bet.' : 'You bet $1.');
      if (this.opener === 'computer' && action === 'check') {
        this.showdown(1);
        return true;
      }
      this.pending = action;
      this.phase = 'thinking';
      if (action === 'bet') this.playerStake = 2;
      return true;
    }
    if (this.phase === 'response' && ['fold', 'call'].includes(action)) {
      this.playerAction = action;
      if (action === 'fold') {
        this.log.push('You fold.');
        this.settle(-1, 'You folded');
      } else {
        this.playerStake = 2;
        this.log.push(this.opener === 'computer' ? 'You call the $1 bet.' : 'You call the $1 raise.');
        this.showdown(2);
      }
      return true;
    }
    return false;
  }
  resolveComputer() {
    if (this.phase !== 'thinking') return false;
    if (this.pending === 'open') {
      const bets = this.rng() < FIRST_BET[this.opponent];
      this.computerAction = bets ? 'bet' : 'check';
      this.pending = null;
      if (bets) {
        this.opponentStake = 2;
        this.phase = 'response';
        this.log.push('The computer opens with a $1 bet. Call or fold?');
      } else {
        this.phase = 'decision';
        this.log.push('The computer checks. You can check or bet $1.');
      }
      return true;
    }
    const probability = this.pending === 'check' ? ON_CHECK[this.opponent] : this.opener === 'computer' ? CALL_RAISE[this.opponent] : ON_BET[this.opponent];
    const bets = this.rng() < probability;
    if (this.pending === 'check') {
      if (bets) {
        this.computerAction = 'raise';
        this.opponentStake = 2;
        this.phase = 'response';
        this.log.push('The computer raises $1. Call or fold?');
      } else {
        this.computerAction = 'check';
        this.log.push('The computer checks.');
        this.showdown(1);
      }
    } else if (bets) {
      this.computerAction = 'call';
      this.opponentStake = 2;
      this.log.push('The computer calls your $1 bet.');
      this.showdown(2);
    } else {
      this.computerAction = 'fold';
      this.log.push('The computer folds.');
      this.settle(1, 'Computer folded');
    }
    return true;
  }
  showdown(stake) {
    const won = this.player > this.opponent;
    this.log.push(`The computer reveals ${RANKS[this.opponent]}♠.`);
    this.settle(won ? stake : -stake, won ? 'Higher card wins' : 'Computer has the higher card');
  }
  settle(delta, reason) {
    this.phase = 'complete';
    this.revealed = true;
    this.outcome = { delta, reason };
    this.session.money += delta;
    this.session.hands += 1;
    if (delta > 0) this.session.wins += 1;
    const record = { number: this.session.hands, player: RANKS[this.player], opponent: RANKS[this.opponent], delta, reason, opener: this.opener };
    this.session.history.unshift(record);
    this.session.history = this.session.history.slice(0, 100);
    this.log.push(`You ${delta > 0 ? 'win' : 'lose'} $${Math.abs(delta)}.`);
  }
}
