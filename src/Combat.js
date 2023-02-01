
class CombatStatus {
    constructor(maxHP, force){
        this.maxHP = maxHP || 10;
        this.hp = this.maxHP;
        this.force = force || 5;
    }
}

class CombatEvent {
    constructor(source, force){
        this.source = source;
        this.force = force;
    }
}

module.exports = {
    CombatEvent,
    CombatStatus
}

