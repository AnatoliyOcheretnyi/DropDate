package themes

// TMDB keyword ids, named after the exact TMDB keyword they stand for. Every id
// was resolved through /search/keyword with an exact (case-insensitive) name
// match, so renaming a constant here without re-resolving it would silently
// change what a theme means.
const (
	// Health & body
	kwCancer          = 10163  // cancer
	kwTerminalIllness = 6564   // terminal illness
	kwIllness         = 40895  // illness
	kwDisease         = 14673  // disease
	kwAlzheimers      = 5903   // alzheimer's disease
	kwHospital        = 11612  // hospital
	kwDisability      = 162735 // disability
	kwEpidemic        = 17995  // epidemic
	kwPandemic        = 188973 // pandemic

	// Mind
	kwMentalIllness        = 41329  // mental illness
	kwMentalHospital       = 190007 // mental hospital
	kwPsychiatricHospital  = 10323  // psychiatric hospital
	kwAsylum               = 2884   // asylum
	kwDepression           = 894    // depression
	kwTherapy              = 40952  // therapy
	kwPsychiatrist         = 15106  // psychiatrist
	kwTrauma               = 2754   // trauma
	kwPTSD                 = 376994 // ptsd
	kwAmnesia              = 1453   // amnesia
	kwPsychologicalThrille = 12565  // psychological thriller
	kwNonlinearTimeline    = 157171 // nonlinear timeline
	kwTwistEnding          = 326438 // twist ending
	kwExistentialism       = 181324 // existentialism
	kwIdentityCrisis       = 3394   // identity crisis
	kwMidlifeCrisis        = 1599   // midlife crisis

	// Addiction
	kwAddiction     = 6782 // addiction
	kwDrugAddiction = 1803 // drug addiction
	kwAlcoholism    = 7464 // alcoholism

	// Family & people
	kwFriendship       = 6054   // friendship
	kwFamilyRelations  = 10235  // family relationships
	kwDysfunctionalFam = 10041  // dysfunctional family
	kwFatherSon        = 240119 // father son relationship
	kwMotherDaughter   = 240315 // mother daughter relationship
	kwSingleParent     = 641    // single parent
	kwAdoption         = 2393   // adoption
	kwPregnancy        = 3725   // pregnancy
	kwGrief            = 9872   // grief
	kwLoss             = 6203   // loss
	kwLoneliness       = 9957   // loneliness
	kwRedemption       = 11436  // redemption
	kwSecondChance     = 34004  // second chance
	kwBasedOnTrueStory = 9672   // based on true story
	kwTrueStory        = 376355 // true story
	kwBiography        = 5565   // biography

	// Youth
	kwComingOfAge = 10683  // coming of age
	kwHighSchool  = 6270   // high school
	kwTeenager    = 296608 // teenager
	kwTeenMovie   = 11870  // teen movie
	kwProm        = 10266  // prom
	kwParty       = 286407 // party
	kwCollege     = 3616   // college
	kwGraduation  = 3687   // graduation
	kwTeacher     = 10508  // teacher
	kwStudent     = 285902 // student
	kwBullying    = 6733   // bullying

	// Love
	kwLove             = 9673   // love
	kwRomance          = 9840   // romance
	kwFallingInLove    = 13072  // falling in love
	kwFirstLove        = 157303 // first love
	kwUnrequitedLove   = 10048  // unrequited love
	kwForbiddenLove    = 3691   // forbidden love
	kwInfidelity       = 1326   // infidelity
	kwLoveTriangle     = 128    // love triangle
	kwRomanticRivalry  = 4516   // romantic rivalry
	kwWedding          = 13027  // wedding
	kwMarriageCrisis   = 5809   // marriage crisis
	kwDivorce          = 15160  // divorce
	kwRomanticComedy   = 380334 // romantic comedy
	kwLongDistanceLove = 185332 // long distance relationship

	// Crime
	kwHeist         = 10051  // heist
	kwBankRobbery   = 15363  // bank robbery
	kwSerialKiller  = 10714  // serial killer
	kwDetective     = 703    // detective
	kwInvestigation = 5340   // investigation
	kwMystery       = 316332 // mystery
	kwMafia         = 10391  // mafia
	kwGangster      = 3149   // gangster
	kwGang          = 10726  // gang
	kwYakuza        = 1794   // yakuza
	kwDrugCartel    = 10175  // drug cartel
	kwPrison        = 378    // prison
	kwPrisonEscape  = 9777   // prison escape
	kwRevenge       = 9748   // revenge
	kwVigilante     = 7002   // vigilante
	kwHitman        = 2708   // hitman
	kwCourtroom     = 33519  // courtroom
	kwLawyer        = 10909  // lawyer
	kwTrial         = 11038  // trial
	kwSpy           = 470    // spy
	kwEspionage     = 5265   // espionage
	kwUndercover    = 1568   // undercover
	kwConspiracy    = 10410  // conspiracy
	kwCorruption    = 417    // corruption
	kwWhistleblower = 209799 // whistleblower
	kwJournalism    = 917    // journalism

	// Fear
	kwHauntedHouse = 3358   // haunted house
	kwGhost        = 162846 // ghost
	kwSupernatural = 6152   // supernatural
	kwExorcism     = 2626   // exorcism
	kwDemon        = 15001  // demon
	kwWitch        = 616    // witch
	kwZombie       = 12377  // zombie
	kwSlasher      = 12339  // slasher
	kwFoundFootage = 163053 // found footage
	kwCult         = 6158   // cult
	kwVampire      = 3133   // vampire
	kwWerewolf     = 12564  // werewolf

	// Adventure & survival
	kwSurvival        = 10349  // survival
	kwWilderness      = 3593   // wilderness
	kwShipwreck       = 2580   // shipwreck
	kwPlaneCrash      = 249530 // plane crash
	kwRoadTrip        = 7312   // road trip
	kwTravel          = 9935   // travel
	kwIsland          = 2041   // island
	kwApocalypse      = 12332  // apocalypse
	kwPostApocalyptic = 4458   // post-apocalyptic future
	kwNaturalDisaster = 5096   // natural disaster
	kwHostage         = 1562   // hostage
	kwKidnapping      = 1930   // kidnapping
	kwEscape          = 10685  // escape
	kwMartialArts     = 779    // martial arts
	kwKungFu          = 780    // kung fu
	kwSamurai         = 1462   // samurai
	kwPirate          = 12988  // pirate

	// Speculative
	kwSpaceTravel  = 3801   // space travel
	kwSpaceStation = 156039 // space station
	kwSpaceOpera   = 161176 // space opera
	kwTimeTravel   = 4379   // time travel
	kwAI           = 378084 // artificial intelligence
	kwRobot        = 14544  // robot
	kwCyberpunk    = 12190  // cyberpunk
	kwVR           = 4563   // virtual reality
	kwAlien        = 9951   // alien
	kwDystopia     = 4565   // dystopia
	kwMagic        = 2343   // magic
	kwWizard       = 177912 // wizard
	kwFairyTale    = 3205   // fairy tale
	kwMythology    = 2035   // mythology
	kwMedieval     = 161257 // medieval
	kwSuperhero    = 9715   // superhero
	kwDinosaur     = 12616  // dinosaur

	// Society & history
	kwWar             = 273967 // war
	kwSoldier         = 13065  // soldier
	kwMilitary        = 162365 // military
	kwWorldWarII      = 1956   // world war ii
	kwHolocaust       = 375138 // holocaust
	kwPolitics        = 6078   // politics
	kwColdWar         = 2106   // cold war
	kwRacism          = 12425  // racism
	kwPoverty         = 12987  // poverty
	kwClassDifference = 14514  // class differences
	kwImmigrant       = 2356   // immigrant
	kwLGBT            = 158718 // lgbt
	kwFeminism        = 2383   // feminism

	// Craft, sport, comfort
	kwMusic      = 283297 // music
	kwMusician   = 4048   // musician
	kwRockBand   = 18001  // rock band
	kwDance      = 1691   // dance
	kwPainter    = 437    // painter
	kwWriter     = 13028  // writer
	kwArtist     = 2679   // artist
	kwSports     = 6075   // sports
	kwBoxing     = 209476 // boxing
	kwOlympics   = 315138 // olympics
	kwChristmas  = 207317 // christmas
	kwHoliday    = 65     // holiday
	kwNewYearEve = 613    // new year's eve
	kwCooking    = 1918   // cooking
	kwChef       = 18293  // chef
	kwRestaurant = 1946   // restaurant
	kwFood       = 10637  // food
	kwDog        = 15162  // dog
	kwCat        = 977    // cat
	kwHorse      = 2673   // horse
	kwSmallTown  = 1415   // small town
	kwWorkplace  = 6282   // workplace
	kwOffice     = 1438   // office
)

// TMDB movie genre ids, used only as sharpening hints on a theme.
const (
	genreComedy  = 35
	genreDrama   = 18
	genreHorror  = 27
	genreRomance = 10749
	genreSciFi   = 878
)
