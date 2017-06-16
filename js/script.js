/* global bp, BP_Reactions */
window.bp  = window.bp  || {};

( function( exports, $ ) {
	if ( 'undefined' === typeof BP_Reactions ) {
		return;
	}

	bp.react = {
		refresh: function() {
			return this.start();
		},
		start: function() {

			// Only logged in users can react!
			/*if ( ! BP_Reactions.is_user_logged_in ) {
				return;
			}*/

			//lets set the size of the emoji images we want to bring back
			twemoji.size = '72x72';
			//this base url has to be different than the url in bp-reactions.php file
			//due to cloudflare having all the emojis we need
			twemoji.base = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/2.3.0/2/';

			//convert the raw emoji to visible emoji
			$('#buddypress .bp_reactions_reactions_list').find('a').each(function() {

				//remove first two chars in string (0x) to feed to twemoji for parsing
				var unicode_emoji = $(this).data('bp-reaction-hex').slice(2);

				//converts hex into unicode emoji for html display
				var emoji = twemoji.parse( twemoji.convert.fromCodePoint( unicode_emoji ) );
				$(this).html( emoji );

			});

			//returns overwriten comment button back to its original form
			$('.button.acomment-reply').empty().append( $('<i />', { class: 'fa fa-reply' }) );

			//to enable .activity-reactions div
			$('.activity-reactions').addClass('active');

			this.addReactions();

			// Edit the reactions
			$( '#buddypress .activity' ).on( 'click', '.activity-list .activity-reactions a', this.saveReaction );

			//load reactions for swa on front page only
			if( BP_Reactions.is_front_page == 1 ) {
				//for swa reactions
				this.addSwaReactions();
			}

		},

		ajax: function( post_data, type ) {
			if ( this.ajax_request ) {
				this.ajax_request.abort();
			}

			// Extend posted data with stored data and object nonce
			$.extend( post_data, { nonce: BP_Reactions.nonces[type] } );

			this.ajax_request = $.post( BP_Reactions.ajaxurl, post_data, 'json' );

			return this.ajax_request;
		},

		warning: function( message, type, element ) {
			var output = $( '<div></div>' ).html( '<p>' + twemoji.convert.fromCodePoint( '0x1F631' ) + ' ' + message + '</p>' ).addClass( type ).prop( 'id', 'message' );

			element.append( output );

			output.fadeOut( 4000, function() {
				$( this ).remove();
			} );
		},

		createReactionEmojis( activity_ids ) {

			//console.log( activity_ids );

			//we will grab each activity list item to be used for .activity-reactions
			$activity = $('ul.activity-list li').filter(function() {

				var activity_id_num = parseInt( this.id.replace('activity-', ''));
				return activity_ids.indexOf( activity_id_num ) > -1;

			});

			//lets create the reaction emojis that will be used by a user on each activity item
			reaction_emojis = $activity.find('.activity-reactions').each(function() {

				var activityID = $(event.currentTarget).data('bp-activity-id'),
					$reactions = $( 'li#activity-' + activityID  ).find( '.activity-reactions' ),
					that = $(this),
					currentItem = $(event.currentTarget);


				//grabbing the scope of the first loop
				var that = $(this);

				//lets create a ul that we can attach lis to which will be used for housing our reactions
				that.append( $('<ul />', { class: 'bp_reactions_reactions_list', 'data-bp-activity-id': that.closest('li').find('.react').data('bp-activity-id') }) );

				//lets append each reaction a user can choose from on the li that was
				//created from each ul in .activity-reactions
				$( BP_Reactions.reaction_emojis ).each(function(k,v) {

					//now we append each reaction emoji to each <li> item
					that.find('ul').append( $('<li />').append( $('<span />').append( $( '<a />', { title: v.name, "data-bp-reaction-id": v.reaction_id, "data-bp-reaction-type": "bp_activity_reaction_" + v.reaction_id } ).append( twemoji.convert.fromCodePoint( v.id ) ) ) ) );

				});

			});

		},

		getActivityIds() {

			var reactions_list = $('.bp_reactions_reactions_list'),
				activity_ids = new Array();

			//lets push the bp ids into the new array for processing
			$.each( reactions_list, function(i, v ) {
				activity_ids.push( $(this).data('bp-activity-id') );
			});

			return activity_ids;

		},

		addReactions() {

			// Only logged in users can react!
			if ( ! BP_Reactions.is_user_logged_in ) {
				return;
			}

			activity_ids = this.getActivityIds();

			//console.log(activity_ids);

			var postdata = {
				action: 'bp_activity_reactions_fetch',
				activity_ids: activity_ids
			};

			bp.react.ajax( postdata, 'fetch' ).done( function( response ) {

				data = response.data;

				//lets loop through the data and add all approopriate items to each div
				$.each( data, function(k, obj) {

					classes = '';

					//console.log( obj );

					//loops through each object and adds their contents to the proper divs
					$.each(obj, function(k,v) {

						//console.log(v);
						//console.log( $(this) );

						//adds the reacted class to the div in the activity feed when it returns true from the db
						if( v.reacted ) {
							$('#buddypress').find('[data-bp-activity-id="' + v.id + '"]').find('a[data-bp-reaction-id="' + k + '"]').addClass('reacted').data('bp-reactions-clicked', false);
						}

						var reaction_count = $('#buddypress').find('[data-bp-activity-id="' + v.id + '"]').find('a[data-bp-reaction-id="' + k + '"]').closest('span').find('.count');

						//checks if the count is greater than zero to output the count
						//clears the <sub> tag if the count is zero
						if( v.count > 0 ) {
							$('#buddypress').find('[data-bp-activity-id="' + v.id + '"]').find('a[data-bp-reaction-id="' + k + '"]').closest('span').find('.count').text( reaction_count.data('bp-reaction-count') );
						} else {
							$('#buddypress').find('[data-bp-activity-id="' + v.id + '"]').find('a[data-bp-reaction-id="' + k + '"]').closest('span').find('.count').text('');
						}

						//adds the reacted class to the div in the swa widget on the front-end when it returns true from the db
						if( v.reacted ) {
							//for sitewide activity widget on front-page
							$('.swa-activity-list').find('[data-bp-activity-id="' + v.id + '"]').find('a[data-bp-reaction-id="' + k + '"]').addClass('reacted').data('bp-reactions-clicked', false);
						}

						var swa_reaction_count = $('.swa-activity-list').find('[data-bp-activity-id="' + v.id + '"]').find('a[data-bp-reaction-id="' + k + '"]').closest('span').find('.count');

						//removes 0 count on swa and adds the actual count on swa when it exists
						if( v.count > 0 ) {
							$('.swa-activity-list').find('[data-bp-activity-id="' + v.id + '"]').find('a[data-bp-reaction-id="' + k + '"]').closest('span').find('.count').text( swa_reaction_count.data('bp-reaction-count') );
						} else {
							$('.swa-activity-list').find('[data-bp-activity-id="' + v.id + '"]').find('a[data-bp-reaction-id="' + k + '"]').closest('span').find('.count').text('');
						}

					});

				});

			});

		},

		saveReaction: function( event ) {
			event.preventDefault();

			//lets remove all emoji's that user has currently reacted to in this <ul>
			//users should only be able to react once per any emoji
			if( ! $(this).hasClass('bp_reactions_favorite') ) {
				//$(this).closest('ul').find('a').removeClass('reacted');
			} else {
				//deal with handling of favorites later
			}

			var $emojiButton = $( event.currentTarget ),
				emojiLink = $.parseHTML( $( event.currentTarget ).html() ),
				$spanEmoji,
				$reactButton = $emojiButton.closest('.bp_reactions_reactions_list'),
				$spanReact,
				reactHtml    = $.parseHTML( $reactButton.html() ),
				newSpanEmoji = '', newSpanReact = '',
				clicked = $(this).data('bp-reactions-clicked');

				if( clicked === undefined ) {
					clicked = $(this).data('bp-reactions-clicked', true);
				}

			//updates or removes count for reaction
			if( clicked ) {

				var countEl = $emojiButton.parent().find('.count');
				var count = parseInt( countEl.text() ) ? parseInt( countEl.text() ) : '';
				++count;

				countEl.text(count);
				//countEl.text(count);

				clicked = $(this).data('bp-reactions-clicked', false);

			} else {

				var countEl = $emojiButton.parent().find('.count');
				var count = parseInt( countEl.text() ) ? parseInt( countEl.text() ) : '';
				--count;

				if( count == 0 ) {
					countEl.text(" ");
				} else {
					countEl.text(count);
				}

				clicked = $(this).data('bp-reactions-clicked', true);
			}

			console.log( clicked );

			//lets reassign the $reactButton if favorites is clicked
			if( $reactButton.length == 0 ) {
				$reactButton = $emojiButton.closest( 'li' ).find( '.react' );
			}

			var postdata = {
				action: 'bp_activity_reactions_save',
				activity_id: $reactButton.data( 'bp-activity-id' ),
				doaction: $emojiButton.hasClass( 'reacted' ) ? 'remove' : 'add',
				reaction: $emojiButton.data( 'bp-reaction-id' ),

			};


			//console.log( $emojiButton.data('bp-reaction-id') );

			bp.react.ajax( postdata, 'save' ).done( function( response ) {
				if ( false === response.success ) {
					bp.react.warning( response.data.message, 'error', $emojiButton.parent() );
					return;
				}

				var result = 1;

				if ( postdata.doaction === 'remove' ) {
					result = -1;
					$emojiButton.removeClass( 'reacted' );
				} else {
					$emojiButton.addClass( 'reacted' );
				}

				// Update Count for the emoji
				$.each( emojiLink, function( i, el ){
					if ( 'SPAN' === el.nodeName ) {
						$spanEmoji   = '<span>' + el.innerHTML + '</span>';
						newSpanEmoji = '<span>' + Number( parseInt( el.innerHTML, 10 ) + result ) + '</span>';
					}
				} );

				if ( '' !== newSpanEmoji ) {
					$emojiButton.html( $emojiButton.html().replace( $spanEmoji, newSpanEmoji ) );
				}

				// Update Count for the react button
				$.each( reactHtml, function( i, el ){
					if ( 'SPAN' === el.nodeName ) {
						$spanReact   = '<span>' + el.innerHTML + '</span>';
						newSpanReact = '<span>' + Number( parseInt( el.innerHTML, 10 ) + result ) + '</span>';
					}
				} );

				if ( '' !== newSpanReact ) {
					$reactButton.html( $reactButton.html().replace( $spanReact, newSpanReact ) );
				}

				if ( 'undefined' !== typeof BP_Reactions.user_scope ) {
					// If on the member's reactions screen, eventually remove entries
					if ( $( '#activity-' + BP_Reactions.user_scope + '-personal-li' ).length && $( '#activity-' + BP_Reactions.user_scope + '-personal-li' ).hasClass( 'selected' ) ) {
						if ( ( 'reactions' === BP_Reactions.user_scope && ! $emojiButton.parent().find( '.reacted' ).length ) || BP_Reactions.user_scope === postdata.reaction ) {
							$emojiButton.closest( 'li' ).remove();
						}
					}
				}

				// If on the popular directory tab, eventually remove entries
				if ( $( '#activity-popular' ).length && $( '#activity-popular' ).hasClass( 'selected' ) ) {
					if ( '<span>0</span>' === newSpanReact ) {
						$emojiButton.closest( 'li' ).remove();
					}
				}
			} );
		},

		addSwaReactions: function() {

			$('.swa-activity-list .bp_reactions_reactions_list').find('a').each(function(){

				//remove first two chars in string (0x) to feed to twemoji for parsing
				var unicode_emoji = $(this).data('bp-reaction-hex').slice(2);

				//converts hex into unicode emoji for html display
				var emoji = twemoji.parse( twemoji.convert.fromCodePoint( unicode_emoji ) );

				$(this).html( emoji );
			});

			$( '.swa-activity-list .activity-item' ).on( 'click', '.activity-reactions a', this.saveReaction );

		}
	};

	/**
	 * Autocomplete for Emojis
	 */
	$( '.bp-suggestions' ).atwho( {
		at: ':',
		tpl: '<li data-value="${id}">${name} <span class="bp-reactions-emoji">${id}</span></li>',
		data: $.map( BP_Reactions.emojis, function( value ) {
			return { 'name': value.name, 'id': twemoji.convert.fromCodePoint( value.id ) };
		} ),
		limit: 10
	} );

	bp.react.start();

	//lets use the ajaxComplete method to spot the ajax request we want to target
	$(document).ajaxComplete(function(event, xhr, options) { 

		var response_text = $.parseJSON( xhr.responseText );

		//this is the request we want to target -- it contains the feed_url for infinite scroll
		if( response_text && response_text.contents ) {
			bp.react.refresh();
		}

	});

} )( bp, jQuery );
