import test from 'node:test';
import assert from 'node:assert/strict';
import { PokerGame, emptySession, ON_BET, ON_CHECK, FIRST_BET, CALL_RAISE } from '../dist/game.js';

function hand(player,opponent,random=0,opener='player') {
  const game = new PokerGame(emptySession(),() => random);
  game.player = player; game.opponent = opponent;
  game.playerStake = game.opponentStake = 1;
  game.opener = opener;
  game.phase = opener === 'computer' ? 'thinking' : 'decision';
  game.pending = opener === 'computer' ? 'open' : null;
  return game;
}
test('dealing produces all 156 distinct, equally mapped ordered pairs',() => {
  const pairs = new Set();
  for(let p=0;p<13;p++)for(let o=0;o<12;o++){
    const draws=[(p+.5)/13,(o+.5)/12];
    const game=new PokerGame(emptySession(),() => draws.shift());
    assert.equal(game.deal(),true); assert.notEqual(game.player,game.opponent);
    assert.equal(game.pot,2); assert.equal(game.session.money,0);
    assert.equal(game.phase,'decision'); pairs.add(`${game.player},${game.opponent}`);
  }
  assert.equal(pairs.size,156);
});
test('every card pair follows the exact check and bet probability tables',() => {
  for(let p=0;p<13;p++)for(let o=0;o<13;o++)if(p!==o){
    for(const [action,table] of [['check',ON_CHECK],['bet',ON_BET]]){
      for(const random of [0,.1,.25,.251,.407,.408,.582,.583,.758,.759,.999999]){
        const g=hand(p,o,random);g.act(action);assert.equal(g.phase,'thinking');
        g.resolveComputer();
        if(action==='check' && random<table[o]){
          assert.equal(g.phase,'response');assert.equal(g.pot,3);assert.equal(g.session.money,0);
          g.act('call');assert.equal(g.pot,4);assert.equal(g.session.money,p>o?2:-2);assert.equal(g.revealed,true);
        }else if(action==='check'){
          assert.equal(g.pot,2);assert.equal(g.session.money,p>o?1:-1);assert.equal(g.revealed,true);
        }else if(random<table[o]){
          assert.equal(g.pot,4);assert.equal(g.session.money,p>o?2:-2);assert.equal(g.revealed,true);
        }else{
          assert.equal(g.pot,3);assert.equal(g.session.money,1);assert.equal(g.revealed,true);assert.equal(g.session.history[0].opponent,['2','3','4','5','6','7','8','9','10','J','Q','K','A'][o]);
        }
        assert.equal(g.phase,'complete');assert.equal(g.session.hands,1);
        assert.equal(g.session.wins,g.session.money>0?1:0);
      }
    }
  }
});
test('folding to a raise loses only the ante and reveals the computer card',() => {
  const g=hand(12,0);g.act('check');g.resolveComputer();g.act('fold');
  assert.equal(g.session.money,-1);assert.equal(g.pot,3);assert.equal(g.revealed,true);
  assert.equal(g.session.history[0].opponent,'2');
});
test('out of turn actions and repeated clicks cannot settle a hand twice',() => {
  const g=hand(12,0);assert.equal(g.act('call'),false);assert.equal(g.resolveComputer(),false);
  g.act('bet');assert.equal(g.act('bet'),false);assert.equal(g.deal(),false);g.resolveComputer();
  for(let i=0;i<10;i++){assert.equal(g.act('bet'),false);assert.equal(g.resolveComputer(),false);}
  assert.equal(g.session.hands,1);assert.equal(g.session.money,1);
});
test('a new hand clears previous outcome and stakes while preserving totals',() => {
  const g=hand(12,0,.25);g.act('bet');g.resolveComputer();g.deal();
  assert.equal(g.phase,'thinking');assert.equal(g.pending,'open');assert.equal(g.opener,'computer');assert.equal(g.revealed,false);assert.equal(g.outcome,null);
  assert.equal(g.pot,2);assert.equal(g.session.money,1);assert.equal(g.session.hands,1);
});
test('history retains the newest 100 hands while totals retain the full session',() => {
  const g=hand(12,0);
  for(let i=0;i<125;i++){g.player=12;g.opponent=0;g.phase='decision';g.act('bet');g.resolveComputer();}
  assert.equal(g.session.hands,125);assert.equal(g.session.money,125);assert.equal(g.session.history.length,100);
  assert.equal(g.session.history[0].number,125);assert.equal(g.session.history.at(-1).number,26);
});
test('all four supplied tables retain their original values',() => {
  assert.deepEqual(ON_CHECK,[1,1,0,0,0,0,0,1,1,1,1,1,1]);
  assert.deepEqual(ON_BET,[0,0,0,.251,.408,.583,.759,1,1,1,1,1,1]);
  assert.deepEqual(FIRST_BET,[.454,.443,.254,0,0,0,0,.422,.549,.598,.615,.628,.641]);
  assert.deepEqual(CALL_RAISE,[0,0,.169,.269,.429,.610,.760,1,1,1,1,1,1]);
});

test('the opener alternates after every finished hand and survives restoring a session',() => {
  const g=new PokerGame(emptySession(),()=>.9999);
  for(let i=0;i<8;i++){
    g.deal();
    assert.equal(g.opener,i%2===0?'player':'computer');
    if(g.opener==='computer'){
      assert.equal(g.phase,'thinking');assert.equal(g.act('bet'),false);
      g.resolveComputer();assert.equal(g.phase,'decision');g.act('check');
    }else{g.act('bet');g.resolveComputer();}
    assert.equal(g.phase,'complete');assert.equal(g.session.hands,i+1);
    assert.equal(g.session.history[0].opener,g.opener);
    const restored=new PokerGame(g.session,()=>.9999);
    assert.equal(restored.nextOpener,i%2===0?'computer':'player');
  }
});

test('an existing human-first session hands the next opening turn to the computer',() => {
  const legacy={money:0,hands:2,wins:1,history:[{number:2,player:'4',opponent:'2',delta:-1,reason:'You folded'}]};
  const g=new PokerGame(legacy,()=>.9999);
  assert.equal(g.nextOpener,'computer');g.deal();assert.equal(g.opener,'computer');
  g.resolveComputer();g.act('check');
  assert.equal(g.session.hands,3);assert.equal(g.session.history[0].opener,'computer');
  assert.equal(new PokerGame(g.session).nextOpener,'player');
  assert.equal(g.session.history[1].number,2);
});

test('computer opening bets use the first-player table for every rank pair and threshold',() => {
  for(let p=0;p<13;p++)for(let o=0;o<13;o++)if(p!==o){
    for(const random of [0,.253,.254,.421,.422,.442,.443,.453,.454,.548,.549,.597,.598,.614,.615,.627,.628,.640,.641,.9999]){
      const g=hand(p,o,random,'computer');
      assert.equal(g.act('check'),false);assert.equal(g.act('call'),false);
      g.resolveComputer();
      assert.equal(g.phase,random<FIRST_BET[o]?'response':'decision');
      assert.equal(g.opponentStake,random<FIRST_BET[o]?2:1);
      assert.equal(g.revealed,false);assert.equal(g.session.hands,0);
      assert.equal(g.resolveComputer(),false);
      if(g.phase==='response'){g.act('call');assert.equal(g.pot,4);assert.equal(g.session.money,p>o?2:-2);}
      else{g.act('check');assert.equal(g.pot,2);assert.equal(g.session.money,p>o?1:-1);}
      assert.equal(g.phase,'complete');assert.equal(g.revealed,true);assert.equal(g.session.hands,1);
    }
  }
});

test('after opening with a check, computer calls use the first-player call table',() => {
  for(let p=0;p<13;p++)for(let o=0;o<13;o++)if(p!==o){
    for(const random of [0,.168,.169,.268,.269,.428,.429,.609,.610,.759,.760,.9999]){
      const draws=[.9999,random];
      const g=hand(p,o,0,'computer');g.rng=()=>draws.shift();
      g.resolveComputer();assert.equal(g.phase,'decision');assert.equal(g.computerAction,'check');
      g.act('bet');assert.equal(g.phase,'thinking');assert.equal(g.pot,3);
      assert.equal(g.act('bet'),false);g.resolveComputer();
      const called=random<CALL_RAISE[o];
      assert.equal(g.session.money,called?(p>o?2:-2):1);
      assert.equal(g.pot,called?4:3);assert.equal(g.revealed,true);
      assert.equal(g.session.hands,1);assert.equal(g.resolveComputer(),false);
    }
  }
});

test('folding to a computer opening bet loses only the ante and reveals both cards',() => {
  const g=hand(12,0,0,'computer');g.resolveComputer();
  assert.equal(g.phase,'response');g.act('fold');
  assert.equal(g.session.money,-1);assert.equal(g.playerStake,1);assert.equal(g.opponentStake,2);
  assert.equal(g.revealed,true);assert.equal(g.session.history[0].opener,'computer');
  assert.equal(g.act('call'),false);assert.equal(g.session.hands,1);
});

test('matching role strategies cancel the positional advantage over a pair of hands',() => {
  let playerOpens=0,computerOpens=0;
  for(let p=0;p<13;p++)for(let o=0;o<13;o++)if(p!==o){
    const sign=p>o?1:-1;
    playerOpens+=FIRST_BET[p]*((1-ON_BET[o])+ON_BET[o]*2*sign)+(1-FIRST_BET[p])*((1-ON_CHECK[o])*sign+ON_CHECK[o]*(CALL_RAISE[p]*2*sign-(1-CALL_RAISE[p])));
    computerOpens+=FIRST_BET[o]*(ON_BET[p]*2*sign-(1-ON_BET[p]))+(1-FIRST_BET[o])*((1-ON_CHECK[p])*sign+ON_CHECK[p]*((1-CALL_RAISE[o])+CALL_RAISE[o]*2*sign));
  }
  playerOpens/=156;computerOpens/=156;
  assert.ok(playerOpens<-.064&&playerOpens>-.065);
  assert.ok(computerOpens>.064&&computerOpens<.065);
  assert.ok(Math.abs(playerOpens+computerOpens)<1e-12);
});
