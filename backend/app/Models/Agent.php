<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Agent extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'email',
        'category',
        'password',
    ];

    protected $hidden = ['password'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
