import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/academic_extra_entities.dart';
import '../../domain/usecases/academics_usecases.dart';

// EVENTS
abstract class LibraryEvent extends Equatable {
  const LibraryEvent();
  @override
  List<Object?> get props => [];
}

class LoadLibraryBooksEvent extends LibraryEvent {}

class SearchLibraryBooksEvent extends LibraryEvent {
  final String query;
  final String category;
  const SearchLibraryBooksEvent({required this.query, this.category = 'ALL'});
  @override
  List<Object?> get props => [query, category];
}

class ReserveBookEvent extends LibraryEvent {
  final String bookId;
  const ReserveBookEvent(this.bookId);
  @override
  List<Object?> get props => [bookId];
}

// STATES
abstract class LibraryState extends Equatable {
  const LibraryState();
  @override
  List<Object?> get props => [];
}

class LibraryInitial extends LibraryState {}
class LibraryLoading extends LibraryState {}

class LibraryBooksLoaded extends LibraryState {
  final List<LibraryBookEntity> allBooks;
  final List<LibraryBookEntity> filteredBooks;
  final String searchQuery;
  final String selectedCategory;

  const LibraryBooksLoaded({
    required this.allBooks,
    required this.filteredBooks,
    this.searchQuery = '',
    this.selectedCategory = 'ALL',
  });

  @override
  List<Object?> get props => [allBooks, filteredBooks, searchQuery, selectedCategory];
}

class BookReservedSuccessState extends LibraryState {
  final String bookTitle;
  const BookReservedSuccessState(this.bookTitle);
  @override
  List<Object?> get props => [bookTitle];
}

class LibraryError extends LibraryState {
  final String message;
  const LibraryError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class LibraryBloc extends Bloc<LibraryEvent, LibraryState> {
  final GetLibraryBooksUseCase getLibraryBooksUseCase;
  List<LibraryBookEntity> _cached = [];

  LibraryBloc({
    required this.getLibraryBooksUseCase,
  }) : super(LibraryInitial()) {
    on<LoadLibraryBooksEvent>((event, emit) async {
      emit(LibraryLoading());
      final result = await getLibraryBooksUseCase(NoParams());
      result.fold(
        (failure) => emit(LibraryError(failure.message)),
        (books) {
          _cached = books;
          emit(LibraryBooksLoaded(
            allBooks: books,
            filteredBooks: books,
          ));
        },
      );
    });

    on<SearchLibraryBooksEvent>((event, emit) {
      if (_cached.isEmpty) return;
      List<LibraryBookEntity> filtered = List.from(_cached);
      if (event.category != 'ALL') {
        filtered = filtered.where((b) => b.category.toUpperCase() == event.category.toUpperCase()).toList();
      }
      if (event.query.isNotEmpty) {
        final q = event.query.toLowerCase();
        filtered = filtered.where((b) =>
            b.title.toLowerCase().contains(q) ||
            b.author.toLowerCase().contains(q) ||
            b.isbn.toLowerCase().contains(q)).toList();
      }
      emit(LibraryBooksLoaded(
        allBooks: _cached,
        filteredBooks: filtered,
        searchQuery: event.query,
        selectedCategory: event.category,
      ));
    });

    on<ReserveBookEvent>((event, emit) {
      final book = _cached.firstWhere(
        (b) => b.id == event.bookId,
        orElse: () => const LibraryBookEntity(
          id: '',
          title: 'Selected Book',
          author: '',
          isbn: '',
          category: '',
          isAvailable: true,
          copiesAvailable: 1,
        ),
      );
      emit(BookReservedSuccessState(book.title));
      emit(LibraryBooksLoaded(allBooks: _cached, filteredBooks: _cached));
    });
  }
}
